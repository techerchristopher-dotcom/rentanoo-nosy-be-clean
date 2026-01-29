import * as z from "zod";

// Schema pour une photo moto (réutilisé dans Step 3 et Step 5)
const motoPhotoSchema = z.object({
  url: z.string(),
  storagePath: z.string(),
});

// Schema Step 3 - Extérieur Moto
const step3MotoSchema = z.object({
  completedAt: z.string().optional(),
  zonesPhotos: z.object({
    avant: z.array(motoPhotoSchema).optional(),
    cote_droit: z.array(motoPhotoSchema).optional(),
    arriere: z.array(motoPhotoSchema).optional(),
    cote_gauche: z.array(motoPhotoSchema).optional(),
    jantes: z.array(motoPhotoSchema).optional(),
  }).optional(),
  degats: z.array(
    z.object({
      zone: z.enum(["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]).optional(),
      description: z.string().optional(),
      photos: z.array(motoPhotoSchema).optional(),
    })
  ).optional(),
});

// Schema Step 5 - Accessoires Moto
const step5MotoSchema = z.object({
  completedAt: z.string().optional(),
  accessories: z.object({
    casque: z.boolean().optional(),
    gants: z.boolean().optional(),
    cadenas: z.boolean().optional(),
    support_telephone: z.boolean().optional(),
    top_case: z.boolean().optional(),
    prise_usb: z.boolean().optional(),
    gilet_jaune: z.boolean().optional(),
    autre: z.boolean().optional(),
  }).optional(),
  photos: z.array(motoPhotoSchema).optional(),
  notes: z.string().optional(),
});

// Schema Step 4 - Intérieur (nullable pour moto, jamais requis)
// ⚠️ IMPORTANT : Step 4 est masqué dans l'UX moto, mais doit exister en DB comme null
const step4MotoSchema = z.null().optional();

// Schema global FormSchemaMoto
export const formSchemaMoto = z.object({
  bookingId: z.string(),
  
  // Step 1 - Identification (identique à voiture)
  conducteur: z.object({
    nom: z.string().min(1, "Le nom est requis"),
    prenom: z.string().min(1, "Le prénom est requis"),
    numeroPermis: z.string().min(5, "Le numéro de permis doit contenir au moins 5 caractères"),
    paysEmission: z.string().min(1, "Le pays d'émission est requis"),
    dateDelivrance: z.string().min(1, "La date de délivrance est requise"),
    dateExpiration: z.string().min(1, "La date d'expiration est requise"),
    categoriePermis: z.string().min(1, "La catégorie de permis est requise"),
    photoPermisRecto: z.string().nullable().optional(),
    photoPermisVerso: z.string().nullable().optional(),
    driver_license_photos_recto: z.string().nullable().optional(),
    driver_license_photos_verso: z.string().nullable().optional(),
  }),
  driver: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    permis: z.string().optional(),
    permisDelivreLe: z.string().optional(),
    permisExpireLe: z.string().optional(),
    pays: z.string().optional(),
    categorie: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
  }).optional(),
  owner: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
  }).optional(),
  reservation: z.object({
    referenceNumber: z.number().nullable().optional(),
    departureDate: z.string().optional(),
    departureTime: z.string().optional(),
    returnDate: z.string().optional(),
    returnTime: z.string().optional(),
    departureLocation: z.string().nullable().optional(),
    returnLocation: z.string().nullable().optional(),
  }).optional(),
  vehicule: z.object({
    marque: z.string().min(1, "La marque est requise"),
    modele: z.string().min(1, "Le modèle est requis"),
    immatriculation: z.string().min(1, "L'immatriculation est requise"),
  }),

  // Step 2 - Relevés (identique à voiture)
  releves: z.object({
    kilometrage: z.number().min(0, "Le kilométrage doit être positif").optional(),
    niveauCarburant: z
      .number()
      .min(0)
      .max(100)
      .optional(),
    photosTableauBord: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
    dashboardPhotos: z.array(z.any()).optional(),
  }),

  // Step 3 - Extérieur Moto (spécifique moto)
  step3: step3MotoSchema.optional(),

  // Step 4 - Intérieur (nullable, jamais requis pour moto)
  // ⚠️ IMPORTANT : Step 4 est masqué dans l'UX moto, mais doit exister en DB comme null
  step4: step4MotoSchema,

  // Step 5 - Accessoires Moto (spécifique moto)
  step5: step5MotoSchema.optional(),

  // Step 6 - Remarques (identique à voiture)
  remarques: z.object({
    observations: z.string().optional(),
  }).optional(),

  // Step 7 - Signatures (identique à voiture)
  signatures: z.object({
    signatureProprietaire: z.string().optional(),
    signatureLocataire: z.string().optional(),
  }).optional(),
  ownerSignature: z.string().optional(),
  driverSignature: z.string().optional(),

  // Damage reports (optionnel, pour compatibilité)
  damageReports: z.array(
    z.object({
      side: z.enum([
        "avant",
        "droit",
        "arriere",
        "gauche",
        "coffre",
        "janteAvDroit",
        "janteArDroit",
        "janteAvGauche",
        "janteArGauche",
      ]).optional(),
      typeDegats: z.array(z.string()).optional(),
      commentaire: z.string().optional(),
      photos: z.array(z.any()).optional(),
    })
  ).optional(),
});

export type FormMotoValues = z.infer<typeof formSchemaMoto>;

// Types dérivés pour faciliter l'usage
export type Step3MotoValues = z.infer<typeof step3MotoSchema>;
export type Step5MotoValues = z.infer<typeof step5MotoSchema>;
