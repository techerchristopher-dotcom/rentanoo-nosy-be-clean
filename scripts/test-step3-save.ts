/**
 * ⭐ Script de test automatique pour l'Étape 3 (Extérieur & Coffre)
 * 
 * Test : Sauvegarde de Step3 dans checkin_depart avec :
 * - Colonnes SQL (photos_exterieur, photos_jantes, photos_coffre, degats)
 * - JSON data.step3
 * - Vérification que les URLs sont bien stockées
 * 
 * Usage :
 *   npx tsx scripts/test-step3-save.ts <booking_id>
 * 
 * Exemple :
 *   npx tsx scripts/test-step3-save.ts fc920e13-b225-4d51-adbc-ddd118cec251
 */

import { createClient } from '@supabase/supabase-js';

// ⚠️ Configuration Supabase (à adapter selon votre .env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zykwfjxurwmputxwlkxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// PAYLOAD DE TEST STEP 3
// ============================================================================

interface ExteriorPhoto {
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
  zone: string;
  kind: string;
  damageIndex?: number;
}

interface ExteriorDamage {
  side: string;
  typeDegats: string[];
  commentaire: string;
  photos: ExteriorPhoto[];
}

interface Step3Payload {
  completedAt: string;
  zonesPhotos: {
    avant: ExteriorPhoto[];
    droit: ExteriorPhoto[];
    arriere: ExteriorPhoto[];
    gauche: ExteriorPhoto[];
    coffre: ExteriorPhoto[];
    janteAvDroit: ExteriorPhoto[];
    janteArDroit: ExteriorPhoto[];
    janteAvGauche: ExteriorPhoto[];
    janteArGauche: ExteriorPhoto[];
  };
  zonesHasDamage: Record<string, boolean>;
  damageReports: ExteriorDamage[];
  coffreEquipements: {
    triangle: boolean;
    gilet: boolean;
    roueSecours: boolean;
    kitAntiCrevaison: boolean;
  };
  propreteExterieure: {
    level: string;
    notes: string;
    photos: ExteriorPhoto[];
  };
}

/**
 * ⭐ Construire un payload Step3 de test
 */
function buildTestStep3Payload(bookingId: string, referenceNumber: number | null): Step3Payload {
  const timestamp = Date.now();
  const folderPrefix = referenceNumber != null ? `resa_${referenceNumber}` : `booking_${bookingId}`;
  const filePrefix = referenceNumber != null ? referenceNumber.toString() : bookingId;

  // Helper pour créer une photo test
  const createPhoto = (bddColumn: string, zone: string, kind: string, suffix = ''): ExteriorPhoto => {
    const uuid = Math.random().toString(36).substring(2, 10);
    return {
      storagePath: `${folderPrefix}/depart/${bddColumn}_${zone}${suffix}_${filePrefix}_${timestamp}_${uuid}.jpg`,
      publicUrl: `https://zykwfjxurwmputxwlkxs.supabase.co/storage/v1/object/public/checkin-photos/${folderPrefix}/depart/${bddColumn}_${zone}${suffix}_${filePrefix}_${timestamp}_${uuid}.jpg`,
      uploadedAt: new Date().toISOString(),
      zone,
      kind,
    };
  };

  return {
    completedAt: new Date().toISOString(),
    zonesPhotos: {
      avant: [createPhoto('photos_exterieur', 'avant', 'overview')],
      droit: [createPhoto('photos_exterieur', 'droit', 'overview')],
      arriere: [createPhoto('photos_exterieur', 'arriere', 'overview')],
      gauche: [createPhoto('photos_exterieur', 'gauche', 'overview')],
      coffre: [createPhoto('photos_coffre', 'coffre', 'coffre')],
      janteAvDroit: [createPhoto('photos_jantes', 'janteAvDroit', 'jante')],
      janteArDroit: [createPhoto('photos_jantes', 'janteArDroit', 'jante')],
      janteAvGauche: [createPhoto('photos_jantes', 'janteAvGauche', 'jante')],
      janteArGauche: [createPhoto('photos_jantes', 'janteArGauche', 'jante')],
    },
    zonesHasDamage: {
      avant: true,
      droit: false,
      arriere: false,
      gauche: false,
      coffre: true,  // ⭐ Dégât présent dans le coffre
    },
    damageReports: [
      {
        side: 'avant',
        typeDegats: ['Rayure'],
        commentaire: 'Petite rayure sur le pare-chocs avant (test automatique)',
        photos: [
          {
            ...createPhoto('degats', 'avant', 'degat', '_degat0'),
            damageIndex: 0,
          },
        ],
      },
      {
        side: 'coffre',  // ⭐ TEST DÉGÂT COFFRE
        typeDegats: ['Tache / salissure', 'Équipement manquant (triangle, gilet, cric…)'],
        commentaire: 'Tache sur le revêtement + triangle manquant (test automatique)',
        photos: [
          {
            ...createPhoto('degats', 'coffre', 'degat', '_degat1'),
            damageIndex: 1,
          },
        ],
      },
    ],
    coffreEquipements: {
      triangle: true,
      gilet: true,
      roueSecours: true,
      kitAntiCrevaison: false,
    },
    propreteExterieure: {
      level: 'Bon',
      notes: 'Véhicule propre (test automatique)',
      photos: [],
    },
  };
}

/**
 * ⭐ Test principal
 */
async function testStep3Save() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 TEST AUTOMATIQUE - SAUVEGARDE ÉTAPE 3");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1️⃣ Récupérer le booking_id depuis les arguments
  const bookingId = process.argv[2];
  if (!bookingId) {
    console.error("❌ Erreur : booking_id manquant");
    console.log("Usage : npx tsx scripts/test-step3-save.ts <booking_id>");
    process.exit(1);
  }

  console.log("📦 Booking ID :", bookingId);

  try {
    // 2️⃣ Récupérer le booking pour obtenir le reference_number
    console.log("\n1️⃣ Récupération du booking...");
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, reference_number")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("❌ Erreur récupération booking:", bookingError);
      throw bookingError || new Error("Booking introuvable");
    }

    const referenceNumber = (booking as any).reference_number || null;
    console.log(`✅ Booking trouvé, reference_number: ${referenceNumber}`);

    // 3️⃣ Vérifier si un check-in existe déjà pour ce booking
    console.log("\n2️⃣ Vérification check-in existant...");
    const { data: existingCheckin, error: selectError } = await supabase
      .from("checkin_depart")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error("❌ Erreur SELECT:", selectError);
      throw selectError;
    }

    const checkinId = existingCheckin?.id || null;
    const action = checkinId ? "UPDATE" : "INSERT";

    console.log(`✅ Check-in ${checkinId ? `trouvé (id: ${checkinId})` : "non trouvé, création nécessaire"}`);
    console.log(`   Action : ${action}`);

    // 4️⃣ Construire le payload Step3 avec reference_number
    console.log("\n3️⃣ Construction du payload Step3...");
    const step3Payload = buildTestStep3Payload(bookingId, referenceNumber);
    console.log("✅ Payload Step3 :", {
      completedAt: step3Payload.completedAt,
      zonesPhotosCount: Object.values(step3Payload.zonesPhotos).flat().length,
      damagesCount: step3Payload.damageReports.length,
    });

    // 5️⃣ Préparer les données pour Supabase
    console.log("\n4️⃣ Préparation des données pour Supabase...");
    
    let mergedData: any = {};
    
    if (checkinId && existingCheckin?.data) {
      // UPDATE : merge avec données existantes
      mergedData = {
        ...existingCheckin.data,
        step3: step3Payload,
      };
      console.log("✅ Mode UPDATE : merge avec step1/step2 existants");
    } else {
      // INSERT : nouvelles données
      mergedData = {
        step3: step3Payload,
      };
      console.log("✅ Mode INSERT : nouvelles données");
    }

    // Extraire les valeurs pour les colonnes SQL
    const photosExterieur = [
      ...step3Payload.zonesPhotos.avant,
      ...step3Payload.zonesPhotos.droit,
      ...step3Payload.zonesPhotos.arriere,
      ...step3Payload.zonesPhotos.gauche,
      ...step3Payload.zonesPhotos.coffre,
    ];
    const photosJantes = [
      ...step3Payload.zonesPhotos.janteAvDroit,
      ...step3Payload.zonesPhotos.janteArDroit,
      ...step3Payload.zonesPhotos.janteAvGauche,
      ...step3Payload.zonesPhotos.janteArGauche,
    ];
    const photosCoffre = step3Payload.zonesPhotos.coffre;
    const degats = step3Payload.damageReports;

    // 6️⃣ Sauvegarder dans checkin_depart
    console.log("\n5️⃣ Sauvegarde dans checkin_depart...");

    let result;
    let dbError;

    if (checkinId) {
      // UPDATE
      const { data, error } = await supabase
        .from("checkin_depart")
        .update({
          data: mergedData,
          photos_exterieur: photosExterieur,
          photos_jantes: photosJantes,
          photos_coffre: photosCoffre,
          degats: degats,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinId)
        .select()
        .single();

      result = data;
      dbError = error;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from("checkin_depart")
        .insert([{
          booking_id: bookingId,
          status: "draft",
          data: mergedData,
          photos_exterieur: photosExterieur,
          photos_jantes: photosJantes,
          photos_coffre: photosCoffre,
          degats: degats,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      result = data;
      dbError = error;
    }

    if (dbError) {
      console.error("❌ Erreur Supabase:", dbError);
      throw dbError;
    }

    console.log("✅ Sauvegarde réussie, checkin_id:", result?.id);

    // 7️⃣ Vérification finale
    console.log("\n6️⃣ Vérification finale...");
    const { data: verification, error: verifyError } = await supabase
      .from("checkin_depart")
      .select("*")
      .eq("id", result?.id)
      .single();

    if (verifyError) {
      console.error("❌ Erreur vérification:", verifyError);
      throw verifyError;
    }

    // 8️⃣ Affichage des résultats
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ RÉSULTATS FINAUX");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 RÉSERVATION :");
    console.log("   - Booking ID        :", bookingId);
    console.log("   - Reference Number  :", referenceNumber);
    console.log("   - Convention naming :", referenceNumber != null ? `resa_${referenceNumber}/...` : `booking_${bookingId}/...`);

    console.log("\n📊 COLONNES SQL :");
    console.log("   - photos_exterieur (length):", Array.isArray(verification.photos_exterieur) ? verification.photos_exterieur.length : 0);
    console.log("   - photos_jantes (length)   :", Array.isArray(verification.photos_jantes) ? verification.photos_jantes.length : 0);
    console.log("   - photos_coffre (length)   :", Array.isArray(verification.photos_coffre) ? verification.photos_coffre.length : 0);
    console.log("   - degats (length)          :", Array.isArray(verification.degats) ? verification.degats.length : 0);

    console.log("\n📸 PHOTOS EXTÉRIEUR (colonne SQL) :");
    if (Array.isArray(verification.photos_exterieur) && verification.photos_exterieur.length > 0) {
      verification.photos_exterieur.forEach((photo: any, index: number) => {
        console.log(`   Photo ${index + 1} :`);
        console.log(`      - zone        : ${photo.zone}`);
        console.log(`      - kind        : ${photo.kind}`);
        console.log(`      - storagePath : ${photo.storagePath}`);
      });
    } else {
      console.log("   (aucune photo)");
    }

    console.log("\n🔧 DÉGÂTS (colonne SQL) :");
    if (Array.isArray(verification.degats) && verification.degats.length > 0) {
      verification.degats.forEach((degat: any, index: number) => {
        console.log(`   Dégât ${index + 1} :`);
        console.log(`      - side        : ${degat.side}`);
        console.log(`      - typeDegats  : ${degat.typeDegats?.join(', ')}`);
        console.log(`      - commentaire : ${degat.commentaire}`);
        console.log(`      - photos (nb) : ${degat.photos?.length || 0}`);
      });
    } else {
      console.log("   (aucun dégât)");
    }

    console.log("\n📦 JSON data.step3 :");
    if (verification.data?.step3) {
      console.log("   - completedAt :", verification.data.step3.completedAt);
      console.log("   - zonesPhotos (total)     :", Object.values(verification.data.step3.zonesPhotos || {}).flat().length);
      console.log("   - damageReports (length)  :", verification.data.step3.damageReports?.length || 0);
    } else {
      console.log("   (step3 vide ou absent)");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ TEST RÉUSSI !");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 9️⃣ Vérifications finales
    const checks = [
      {
        name: "photos_exterieur est un array",
        passed: Array.isArray(verification.photos_exterieur),
      },
      {
        name: "photos_exterieur contient des photos",
        passed: Array.isArray(verification.photos_exterieur) && verification.photos_exterieur.length > 0,
      },
      {
        name: "photos_jantes est un array",
        passed: Array.isArray(verification.photos_jantes),
      },
      {
        name: "photos_jantes contient des photos",
        passed: Array.isArray(verification.photos_jantes) && verification.photos_jantes.length > 0,
      },
      {
        name: "degats est un array",
        passed: Array.isArray(verification.degats),
      },
      {
        name: "degats contient 2 dégâts (avant + coffre)",
        passed: Array.isArray(verification.degats) && verification.degats.length === 2,
      },
      {
        name: "⭐ Dégât coffre présent avec side='coffre'",
        passed: Array.isArray(verification.degats) && verification.degats.some((d: any) => d.side === 'coffre'),
      },
      {
        name: "⭐ Dégât coffre a des photos",
        passed: Array.isArray(verification.degats) && verification.degats.find((d: any) => d.side === 'coffre')?.photos?.length > 0,
      },
      {
        name: "data.step3 existe",
        passed: !!verification.data?.step3,
      },
      {
        name: "data.step3.zonesPhotos existe",
        passed: !!verification.data?.step3?.zonesPhotos,
      },
      {
        name: "⭐ Naming avec reference_number (resa_8/)",
        passed: referenceNumber != null 
          ? verification.photos_exterieur?.[0]?.storagePath?.includes(`resa_${referenceNumber}/`)
          : verification.photos_exterieur?.[0]?.storagePath?.includes(`booking_`),
      },
    ];

    console.log("\n🔍 CHECKLIST DE VALIDATION :");
    checks.forEach((check) => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.passed);
    if (allPassed) {
      console.log("\n🎉 TOUS LES TESTS SONT PASSÉS !");
    } else {
      console.log("\n⚠️ CERTAINS TESTS ONT ÉCHOUÉ, vérifiez les logs ci-dessus");
    }

  } catch (error: any) {
    console.error("\n❌ ERREUR PENDANT LE TEST:", error);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    process.exit(1);
  }
}

// Exécution
testStep3Save();

