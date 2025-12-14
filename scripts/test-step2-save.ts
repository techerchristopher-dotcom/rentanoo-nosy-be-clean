/**
 * ⭐ Script de test automatique pour l'Étape 2 (Relevés du véhicule)
 * 
 * Test : Sauvegarde de Step2 dans checkin_depart avec :
 * - Colonnes SQL (kilometrage_depart, niveau_carburant, photos_dashboard)
 * - JSON data.step2
 * - Vérification que les URLs sont bien stockées
 * 
 * Usage :
 *   npx tsx scripts/test-step2-save.ts <booking_id>
 * 
 * Exemple :
 *   npx tsx scripts/test-step2-save.ts fc920e13-b225-4d51-adbc-ddd118cec251
 */

import { createClient } from '@supabase/supabase-js';

// ⚠️ Configuration Supabase (à adapter selon votre .env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zykwfjxurwmputxwlkxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// PAYLOAD DE TEST STEP 2
// ============================================================================

interface Step2Payload {
  completedAt: string;
  vehicule: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
  releves: {
    kilometrage: number;
    niveauCarburant: number;
    dashboardPhotos: {
      storagePath: string;
      publicUrl: string;
      uploadedAt: string;
    }[];
  };
}

/**
 * ⭐ Construire un payload Step2 de test
 */
function buildTestStep2Payload(bookingId: string, referenceNumber: number | null): Step2Payload {
  const timestamp = Date.now();
  const uuid1 = Math.random().toString(36).substring(2, 10);
  const uuid2 = Math.random().toString(36).substring(2, 10);

  // ⭐ Utiliser la nouvelle convention avec reference_number
  const folderPrefix = referenceNumber != null ? `resa_${referenceNumber}` : `booking_${bookingId}`;
  const filePrefix = referenceNumber != null ? referenceNumber.toString() : bookingId;

  return {
    completedAt: new Date().toISOString(),
    vehicule: {
      marque: "Peugeot",
      modele: "208",
      immatriculation: "AB-123-CD",
    },
    releves: {
      kilometrage: 45000,
      niveauCarburant: 75,
      dashboardPhotos: [
        {
          storagePath: `${folderPrefix}/depart/photos_dashboard_${filePrefix}_${timestamp}_${uuid1}.jpg`,
          publicUrl: `https://zykwfjxurwmputxwlkxs.supabase.co/storage/v1/object/public/checkin-photos/${folderPrefix}/depart/photos_dashboard_${filePrefix}_${timestamp}_${uuid1}.jpg`,
          uploadedAt: new Date().toISOString(),
        },
        {
          storagePath: `${folderPrefix}/depart/photos_dashboard_${filePrefix}_${timestamp + 1000}_${uuid2}.jpg`,
          publicUrl: `https://zykwfjxurwmputxwlkxs.supabase.co/storage/v1/object/public/checkin-photos/${folderPrefix}/depart/photos_dashboard_${filePrefix}_${timestamp + 1000}_${uuid2}.jpg`,
          uploadedAt: new Date(Date.now() + 1000).toISOString(),
        },
      ],
    },
  };
}

/**
 * ⭐ Test principal
 */
async function testStep2Save() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 TEST AUTOMATIQUE - SAUVEGARDE ÉTAPE 2");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1️⃣ Récupérer le booking_id depuis les arguments
  const bookingId = process.argv[2];
  if (!bookingId) {
    console.error("❌ Erreur : booking_id manquant");
    console.log("Usage : npx tsx scripts/test-step2-save.ts <booking_id>");
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

    // 4️⃣ Construire le payload Step2 avec reference_number
    console.log("\n3️⃣ Construction du payload Step2...");
    const step2Payload = buildTestStep2Payload(bookingId, referenceNumber);
    console.log("✅ Payload Step2 :", {
      completedAt: step2Payload.completedAt,
      kilometrage: step2Payload.releves.kilometrage,
      niveauCarburant: step2Payload.releves.niveauCarburant,
      photosCount: step2Payload.releves.dashboardPhotos.length,
    });

    // 5️⃣ Préparer les données pour Supabase
    console.log("\n4️⃣ Préparation des données pour Supabase...");
    
    let mergedData: any = {};
    
    if (checkinId && existingCheckin?.data) {
      // UPDATE : merge avec données existantes
      mergedData = {
        ...existingCheckin.data,
        step2: step2Payload,
      };
      console.log("✅ Mode UPDATE : merge avec step1 existant");
    } else {
      // INSERT : nouvelles données
      mergedData = {
        step2: step2Payload,
      };
      console.log("✅ Mode INSERT : nouvelles données");
    }

    // Extraire les valeurs pour les colonnes SQL
    const kilometrageDepart = step2Payload.releves.kilometrage;
    const niveauCarburant = step2Payload.releves.niveauCarburant;
    const dashboardPhotos = step2Payload.releves.dashboardPhotos;

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
          kilometrage_depart: kilometrageDepart,
          niveau_carburant: niveauCarburant,
          photos_dashboard: dashboardPhotos,
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
          kilometrage_depart: kilometrageDepart,
          niveau_carburant: niveauCarburant,
          photos_dashboard: dashboardPhotos,
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
    console.log("   - kilometrage_depart :", verification.kilometrage_depart);
    console.log("   - niveau_carburant   :", verification.niveau_carburant);
    console.log("   - photos_dashboard (type):", typeof verification.photos_dashboard);
    console.log("   - photos_dashboard (length):", Array.isArray(verification.photos_dashboard) ? verification.photos_dashboard.length : 0);

    console.log("\n📸 PHOTOS DASHBOARD (dans colonne SQL) :");
    if (Array.isArray(verification.photos_dashboard) && verification.photos_dashboard.length > 0) {
      verification.photos_dashboard.forEach((photo: any, index: number) => {
        console.log(`   Photo ${index + 1} :`);
        console.log(`      - storagePath : ${photo.storagePath}`);
        console.log(`      - publicUrl   : ${photo.publicUrl}`);
        console.log(`      - uploadedAt  : ${photo.uploadedAt}`);
      });
    } else {
      console.log("   (aucune photo)");
    }

    console.log("\n📦 JSON data.step2 :");
    if (verification.data?.step2) {
      console.log("   - completedAt :", verification.data.step2.completedAt);
      console.log("   - vehicule    :", verification.data.step2.vehicule);
      console.log("   - releves.kilometrage      :", verification.data.step2.releves?.kilometrage);
      console.log("   - releves.niveauCarburant  :", verification.data.step2.releves?.niveauCarburant);
      console.log("   - releves.dashboardPhotos (length):", verification.data.step2.releves?.dashboardPhotos?.length || 0);
    } else {
      console.log("   (step2 vide ou absent)");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ TEST RÉUSSI !");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 9️⃣ Vérifications finales
    const checks = [
      {
        name: "Kilométrage stocké en SQL",
        passed: verification.kilometrage_depart === 45000,
      },
      {
        name: "Niveau carburant stocké en SQL",
        passed: verification.niveau_carburant === 75,
      },
      {
        name: "photos_dashboard est un array",
        passed: Array.isArray(verification.photos_dashboard),
      },
      {
        name: "photos_dashboard contient des photos",
        passed: Array.isArray(verification.photos_dashboard) && verification.photos_dashboard.length === 2,
      },
      {
        name: "photos_dashboard[0] contient publicUrl",
        passed: verification.photos_dashboard?.[0]?.publicUrl?.startsWith('https://'),
      },
      {
        name: "data.step2 existe",
        passed: !!verification.data?.step2,
      },
      {
        name: "data.step2.releves.dashboardPhotos existe",
        passed: Array.isArray(verification.data?.step2?.releves?.dashboardPhotos),
      },
      {
        name: "Cohérence SQL ↔ JSON (kilometrage)",
        passed: verification.kilometrage_depart === verification.data?.step2?.releves?.kilometrage,
      },
      {
        name: "Cohérence SQL ↔ JSON (carburant)",
        passed: verification.niveau_carburant === verification.data?.step2?.releves?.niveauCarburant,
      },
      {
        name: "⭐ Naming avec reference_number (resa_8/)",
        passed: referenceNumber != null 
          ? verification.photos_dashboard?.[0]?.storagePath?.includes(`resa_${referenceNumber}/`)
          : verification.photos_dashboard?.[0]?.storagePath?.includes(`booking_`),
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
testStep2Save();

