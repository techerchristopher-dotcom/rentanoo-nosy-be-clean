import { z } from "zod";

// Schema pour une zone avec dégâts (avant, arrière)
const zoneDegatsSchema = z.object({
  photo_zone: z.array(z.string()).default([]),
  degat_present: z.boolean().nullable().default(null),
  degat_description: z.string().optional(),
  degat_photos: z.array(z.string()).optional(),
});

// Schema pour une zone avec dégâts + jantes (côtés droit et gauche)
const zoneDegatsAvecJantesSchema = zoneDegatsSchema.extend({
  jante_av_droite: z.array(z.string()).optional(),
  jante_ar_droite: z.array(z.string()).optional(),
  jante_av_gauche: z.array(z.string()).optional(),
  jante_ar_gauche: z.array(z.string()).optional(),
});

// Schema pour le coffre
const coffreSchema = z.object({
  photo_coffre_ouvert: z.array(z.string()).default([]),
  gilet_triangle_present: z.boolean().nullable().default(null),
  roue_secours: z.enum(["roue", "kit", "aucun"]).nullable().default(null),
  cable_recharge_present: z.enum(["oui", "non", "na"]).nullable().default(null),
  photos_accessoires: z.array(z.string()).optional(),
});

// Schema complet pour l'inspection extérieure
export const inspectionExterieureSchema = z.object({
  avant: zoneDegatsSchema,
  cote_droit: zoneDegatsAvecJantesSchema,
  arriere: zoneDegatsSchema,
  coffre: coffreSchema,
  cote_gauche: zoneDegatsAvecJantesSchema,
});

export type InspectionExterieureData = z.infer<typeof inspectionExterieureSchema>;

