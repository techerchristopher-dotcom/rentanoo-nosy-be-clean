-- Back-office Nosy Be: RPC functions for stock and repairs

-- Helper: verify caller is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- rpc_stock_in: add stock after purchase
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_stock_in(
  p_part_id uuid,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantité doit être positive';
  END IF;

  v_user_id := auth.uid();

  SELECT id INTO v_movement_id FROM parts WHERE id = p_part_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pièce introuvable: %', p_part_id;
  END IF;

  INSERT INTO stock_movements (
    part_id, movement_type, quantity, unit_cost, reason, supplier_id, created_by
  ) VALUES (
    p_part_id, 'stock_in', p_quantity, p_unit_cost, p_reason, p_supplier_id, v_user_id
  )
  RETURNING id INTO v_movement_id;

  UPDATE parts
  SET
    quantity_on_hand = quantity_on_hand + p_quantity,
    purchase_price = CASE
      WHEN purchase_price IS NULL THEN p_unit_cost
      WHEN quantity_on_hand = 0 THEN p_unit_cost
      ELSE ((purchase_price * quantity_on_hand) + (p_unit_cost * p_quantity))
           / (quantity_on_hand + p_quantity)
    END,
    updated_at = now()
  WHERE id = p_part_id;

  RETURN v_movement_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_stock_adjustment: manual inventory correction
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_stock_adjustment(
  p_part_id uuid,
  p_delta integer,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id uuid;
  v_current_qty integer;
  v_user_id uuid;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Le delta ne peut pas être zéro';
  END IF;

  v_user_id := auth.uid();

  SELECT quantity_on_hand INTO v_current_qty
  FROM parts WHERE id = p_part_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pièce introuvable: %', p_part_id;
  END IF;

  IF v_current_qty + p_delta < 0 THEN
    RAISE EXCEPTION 'Stock insuffisant: disponible %, delta %', v_current_qty, p_delta;
  END IF;

  INSERT INTO stock_movements (
    part_id, movement_type, quantity, reason, created_by
  ) VALUES (
    p_part_id, 'adjustment', p_delta, p_reason, v_user_id
  )
  RETURNING id INTO v_movement_id;

  UPDATE parts
  SET quantity_on_hand = quantity_on_hand + p_delta, updated_at = now()
  WHERE id = p_part_id;

  RETURN v_movement_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_consume_parts_for_repair: consume parts for internal repair
-- p_lines: [{ "part_id": "uuid", "quantity": 2, "client_request_id": "uuid" }]
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_consume_parts_for_repair(
  p_repair_id uuid,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line jsonb;
  v_part_id uuid;
  v_quantity integer;
  v_client_request_id uuid;
  v_unit_cost numeric;
  v_current_qty integer;
  v_movement_id uuid;
  v_user_id uuid;
  v_repair_status text;
  v_inserted_ids uuid[] := '{}';
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  v_user_id := auth.uid();

  SELECT status INTO v_repair_status FROM repairs WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réparation introuvable: %', p_repair_id;
  END IF;

  IF v_repair_status IN ('done', 'cancelled') THEN
    RAISE EXCEPTION 'Réparation clôturée ou annulée';
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Aucune ligne de pièce fournie';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_part_id := (v_line->>'part_id')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    v_client_request_id := COALESCE((v_line->>'client_request_id')::uuid, gen_random_uuid());

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide pour pièce %', v_part_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM repair_parts
      WHERE repair_id = p_repair_id AND client_request_id = v_client_request_id
    ) THEN
      CONTINUE;
    END IF;

    SELECT quantity_on_hand, purchase_price
    INTO v_current_qty, v_unit_cost
    FROM parts WHERE id = v_part_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pièce introuvable: %', v_part_id;
    END IF;

    IF v_current_qty < v_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant pour pièce %: disponible %, demandé %',
        v_part_id, v_current_qty, v_quantity;
    END IF;

    v_unit_cost := COALESCE(v_unit_cost, 0);

    INSERT INTO stock_movements (
      part_id, movement_type, quantity, unit_cost, reason, repair_id, created_by
    ) VALUES (
      v_part_id, 'internal_use', -v_quantity, v_unit_cost,
      'Consommation réparation', p_repair_id, v_user_id
    )
    RETURNING id INTO v_movement_id;

    UPDATE parts
    SET quantity_on_hand = quantity_on_hand - v_quantity, updated_at = now()
    WHERE id = v_part_id;

    INSERT INTO repair_parts (
      repair_id, part_id, quantity, unit_cost, stock_movement_id, client_request_id
    ) VALUES (
      p_repair_id, v_part_id, v_quantity, v_unit_cost, v_movement_id, v_client_request_id
    );

    v_inserted_ids := array_append(v_inserted_ids, v_movement_id);
  END LOOP;

  UPDATE repairs SET status = 'in_progress', updated_at = now()
  WHERE id = p_repair_id AND status = 'open';

  RETURN jsonb_build_object(
    'repair_id', p_repair_id,
    'movement_ids', to_jsonb(v_inserted_ids)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- rpc_cancel_repair: cancel repair and restore stock
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_cancel_repair(p_repair_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rp record;
  v_movement_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  v_user_id := auth.uid();

  PERFORM 1 FROM repairs WHERE id = p_repair_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réparation introuvable: %', p_repair_id;
  END IF;

  FOR v_rp IN
    SELECT rp.* FROM repair_parts rp WHERE rp.repair_id = p_repair_id
  LOOP
    INSERT INTO stock_movements (
      part_id, movement_type, quantity, unit_cost, reason, repair_id, created_by
    ) VALUES (
      v_rp.part_id, 'return', v_rp.quantity, v_rp.unit_cost,
      'Annulation réparation', p_repair_id, v_user_id
    )
    RETURNING id INTO v_movement_id;

    UPDATE parts
    SET quantity_on_hand = quantity_on_hand + v_rp.quantity, updated_at = now()
    WHERE id = v_rp.part_id;
  END LOOP;

  DELETE FROM repair_parts WHERE repair_id = p_repair_id;

  UPDATE repairs
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_repair_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Phase 2: rpc_create_part_sale
-- p_payload: { customer_id?, customer_name?, discount?, payment_method?,
--   amount_paid?, notes?, lines: [{ part_id, quantity, unit_sale_price? }] }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_create_part_sale(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_line jsonb;
  v_part_id uuid;
  v_quantity integer;
  v_unit_sale_price numeric;
  v_unit_purchase_price numeric;
  v_current_qty integer;
  v_movement_id uuid;
  v_subtotal numeric := 0;
  v_margin numeric := 0;
  v_discount numeric;
  v_total numeric;
  v_user_id uuid;
  v_payment_status text;
  v_amount_paid numeric;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  v_user_id := auth.uid();
  v_discount := COALESCE((p_payload->>'discount')::numeric, 0);
  v_amount_paid := COALESCE((p_payload->>'amount_paid')::numeric, 0);

  INSERT INTO sales (
    customer_id, customer_name, discount, payment_method, amount_paid, notes, created_by
  ) VALUES (
    (p_payload->>'customer_id')::uuid,
    p_payload->>'customer_name',
    v_discount,
    p_payload->>'payment_method',
    v_amount_paid,
    p_payload->>'notes',
    v_user_id
  )
  RETURNING id INTO v_sale_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_part_id := (v_line->>'part_id')::uuid;
    v_quantity := (v_line->>'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT quantity_on_hand, purchase_price, sale_price
    INTO v_current_qty, v_unit_purchase_price, v_unit_sale_price
    FROM parts WHERE id = v_part_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pièce introuvable: %', v_part_id;
    END IF;

    IF v_current_qty < v_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant pour pièce %', v_part_id;
    END IF;

    v_unit_sale_price := COALESCE(
      (v_line->>'unit_sale_price')::numeric,
      v_unit_sale_price,
      0
    );
    v_unit_purchase_price := COALESCE(v_unit_purchase_price, 0);

    INSERT INTO stock_movements (
      part_id, movement_type, quantity, unit_cost, unit_sale_price,
      reason, sale_id, created_by
    ) VALUES (
      v_part_id, 'customer_sale', -v_quantity, v_unit_purchase_price, v_unit_sale_price,
      'Vente comptoir', v_sale_id, v_user_id
    )
    RETURNING id INTO v_movement_id;

    UPDATE parts
    SET quantity_on_hand = quantity_on_hand - v_quantity, updated_at = now()
    WHERE id = v_part_id;

    INSERT INTO sale_lines (
      sale_id, part_id, quantity, unit_purchase_price, unit_sale_price, stock_movement_id
    ) VALUES (
      v_sale_id, v_part_id, v_quantity, v_unit_purchase_price, v_unit_sale_price, v_movement_id
    );

    v_subtotal := v_subtotal + (v_quantity * v_unit_sale_price);
    v_margin := v_margin + (v_quantity * (v_unit_sale_price - v_unit_purchase_price));
  END LOOP;

  v_total := GREATEST(v_subtotal - v_discount, 0);

  IF v_amount_paid >= v_total AND v_total > 0 THEN
    v_payment_status := 'paid';
  ELSIF v_amount_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  UPDATE sales SET
    subtotal = v_subtotal,
    total_amount = v_total,
    margin_total = v_margin - v_discount,
    payment_status = v_payment_status,
    updated_at = now()
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Phase 2: rpc_cancel_part_sale
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_cancel_part_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sl record;
  v_user_id uuid;
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Accès refusé: admin requis';
  END IF;

  v_user_id := auth.uid();

  PERFORM 1 FROM sales WHERE id = p_sale_id AND cancelled_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vente introuvable ou déjà annulée: %', p_sale_id;
  END IF;

  FOR v_sl IN SELECT * FROM sale_lines WHERE sale_id = p_sale_id
  LOOP
    INSERT INTO stock_movements (
      part_id, movement_type, quantity, unit_cost, unit_sale_price,
      reason, sale_id, created_by
    ) VALUES (
      v_sl.part_id, 'return', v_sl.quantity, v_sl.unit_purchase_price, v_sl.unit_sale_price,
      'Annulation vente', p_sale_id, v_user_id
    );

    UPDATE parts
    SET quantity_on_hand = quantity_on_hand + v_sl.quantity, updated_at = now()
    WHERE id = v_sl.part_id;
  END LOOP;

  UPDATE sales SET cancelled_at = now(), updated_at = now() WHERE id = p_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_stock_in(uuid, integer, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_stock_adjustment(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_consume_parts_for_repair(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_cancel_repair(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_create_part_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_cancel_part_sale(uuid) TO authenticated;
