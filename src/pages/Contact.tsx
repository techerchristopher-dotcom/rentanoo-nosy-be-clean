import { useState, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/seo/Seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

// Schéma de validation
const contactFormSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z
    .string()
    .trim()
    .email("Adresse email invalide"),
  phone: z.string().optional(),
  subject: z.string().min(3, "L'objet doit contenir au moins 3 caractères"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
  attachment: z.instanceof(FileList).optional(),
  website: z.string().optional(), // Honeypot
});

type ContactFormData = z.infer<typeof contactFormSchema>;

// Helper pour convertir un File en base64 (sans préfixe data:)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        // result = "data:...;base64,AAAA..."
        const parts = result.split(",");
        const base64 = parts[1] ?? "";
        resolve(base64);
      } else {
        reject(new Error("FileReader result is not a string"));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error("FileReader error"));
    };

    reader.readAsDataURL(file);
  });
};

export default function Contact() {
  const { t } = useTranslation("common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    if (import.meta.env.DEV) {
      const domEmailInput = document.getElementById("email") as HTMLInputElement | null;
      const domEmail = domEmailInput?.value ?? null;
      console.log("[Contact] 🧪 Email debug (RHF vs DOM)", {
        dataEmail: data.email,
        dataEmailType: typeof data.email,
        dataEmailLength: data.email?.length ?? 0,
        dataEmailJson: JSON.stringify(data.email),
        domEmail,
        domEmailType: typeof domEmail,
        domEmailLength: domEmail?.length ?? 0,
        domEmailJson: JSON.stringify(domEmail),
      });
    }
    console.log("[Contact] 🚀 SUBMIT START - Formulaire soumis");

    // Vérification honeypot
    if (data.website) {
      console.log("[Contact] 🤖 Bot détecté (honeypot), arrêt");
      // Bot détecté, ne rien faire
      return;
    }

    console.log("[Contact] 📝 Données du formulaire:", {
      fullName: data.fullName,
      email: data.email,
      subject: data.subject,
      hasPhone: !!data.phone,
      hasAttachment: !!(data.attachment && data.attachment.length > 0),
    });

    // Utiliser startTransition pour éviter les re-renders synchrones
    // qui peuvent causer des problèmes avec les composants Radix UI (DropdownMenu, etc.)
    startTransition(() => {
      setIsSubmitting(true);
    });
    console.log("[Contact] ✅ isSubmitting mis à true");

    // Déterminer l'URL de l'API selon l'environnement
    // Stratégie robuste :
    // 1. Si VITE_API_URL est défini, l'utiliser (backend sur autre domaine)
    // 2. Sinon, utiliser une URL relative (backend sur même domaine - fonctionne en prod et dev via proxy Vite)
    const apiBase = import.meta.env.VITE_API_URL?.trim();
    const apiUrl = apiBase ? `${apiBase}/api/contact` : "/api/contact";
    console.log("[Contact] 🔗 URL API déterminée:", apiUrl);

    // Créer un AbortController pour gérer le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("[Contact] ⏱️ TIMEOUT - La requête a pris plus de 15s, annulation");
      controller.abort();
    }, 15000); // 15 secondes

    try {
      // Préparer le payload JSON pour n8n
      const payload: any = {
        fullName: data.fullName,
        email: data.email,
        subject: data.subject,
        message: data.message,
        timestamp: new Date().toISOString(),
        // Toujours inclure phone, même si vide (pour n8n)
        phone: data.phone ?? "",
      };

      // Gérer la pièce jointe si présente
      const file = data.attachment && data.attachment.length > 0 ? data.attachment[0] : null;

      if (file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          // Fichier trop gros → annuler l'envoi avant l'appel webhook
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          console.error("[Contact] ❌ Pièce jointe trop volumineuse:", {
            filename: file.name,
            size: file.size,
            maxSize,
          });
          toast.error(t("contact.fileTooLarge", "Le fichier ne doit pas dépasser 10MB"), {
            description: t("contact.error", "Erreur"),
          });
          return;
        }

        try {
          const contentBase64 = await fileToBase64(file);

          payload.attachment = {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            contentBase64,
          };

          console.log("[Contact] 📎 attachment info", {
            filename: payload.attachment.filename,
            contentType: payload.attachment.contentType,
            size: payload.attachment.size,
            base64Length: payload.attachment.contentBase64.length,
          });
        } catch (fileError) {
          console.error("[Contact] ❌ Erreur conversion pièce jointe en base64:", fileError);
          clearTimeout(timeoutId);
          setIsSubmitting(false);
          toast.error(t("contact.error", "Erreur"), {
            description: t(
              "contact.attachmentConvertError",
              "Erreur lors de la préparation de la pièce jointe. Veuillez réessayer sans fichier ou avec un autre fichier."
            ),
          });
          return;
        }
      }

      // Log du payload avant envoi pour debugging (sans base64)
      const payloadForLog = {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        hasPhoneKey: Object.prototype.hasOwnProperty.call(payload, "phone"),
        subject: payload.subject,
        hasTimestamp: !!payload.timestamp,
        hasAttachment: !!payload.attachment,
        attachmentMeta: payload.attachment
          ? {
              filename: payload.attachment.filename,
              contentType: payload.attachment.contentType,
              size: payload.attachment.size,
              base64Length: payload.attachment.contentBase64.length,
            }
          : null,
      };

      const payloadJsonForSize = JSON.stringify({
        ...payload,
        ...(payload.attachment && {
          attachment: {
            ...payload.attachment,
            contentBase64: "[base64 omitted]",
          },
        }),
      });

      let payloadSizeBytes = 0;
      try {
        payloadSizeBytes = new TextEncoder().encode(payloadJsonForSize).length;
      } catch {
        payloadSizeBytes = payloadJsonForSize.length;
      }

      console.log("[Contact] 📦 payload sending", {
        ...payloadForLog,
        payloadSizeBytes,
      });

      console.log("[Contact] 📡 ABOUT TO FETCH - Envoi requête vers:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal, // Ajouter le signal pour le timeout
      });

      console.log("[Contact] ✅ FETCH RESOLVED - Réponse reçue:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      // Annuler le timeout car la réponse est arrivée
      clearTimeout(timeoutId);

      // Logs détaillés pour le debugging
      console.log("[Contact] 📥 Réponse reçue:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: apiUrl,
      });

      // Lire le body même en cas d'erreur pour avoir le message
      let result;
      try {
        console.log("[Contact] 📄 PARSING RESPONSE - Lecture du body...");
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
        console.log("[Contact] ✅ RESPONSE PARSED - Body parsé:", result);
      } catch (parseError) {
        console.error("[Contact] ❌ Erreur parsing réponse:", parseError);
        result = { error: "Erreur de communication avec le serveur" };
      }

      if (!response.ok) {
        // Extraire les détails d'erreur du backend
        const errorCode = result.code || null;
        const errorMessage =
          result.message || result.error || result.details || t("contact.errorGeneric", "Erreur lors de l'envoi");
        const errorDetails = result.details || "";

        console.error("[Contact] ❌ Erreur HTTP:", {
          status: response.status,
          statusText: response.statusText,
          error: result.error || "Erreur inconnue",
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          url: apiUrl,
          fullResult: result,
        });

        // Créer un message d'erreur dev-friendly avec code et détails
        let fullErrorMessage = errorMessage;
        if (errorCode) {
          fullErrorMessage = `[${errorCode}] ${errorMessage}`;
        }
        if (errorDetails && errorDetails !== errorMessage) {
          fullErrorMessage = `${fullErrorMessage}: ${errorDetails}`;
        }

        throw new Error(fullErrorMessage);
      }

      console.log("[Contact] ✅ SUCCESS HANDLED - Envoi réussi, affichage toast");

      toast.success(t("contact.success", "Message envoyé !"), {
        description: t(
          "contact.successDescription",
          "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais."
        ),
      });

      // Reset après un court délai pour laisser le toast s'afficher
      // Utiliser startTransition pour éviter les re-renders synchrones
      setTimeout(() => {
        startTransition(() => {
          reset();
        });
      }, 100);
    } catch (error: any) {
      console.error("[Contact] ❌ CATCH REACHED - Erreur capturée:", {
        error: error.message || String(error),
        name: error.name,
        stack: error.stack,
        url: apiUrl || "URL non déterminée",
      });

      // Annuler le timeout si on est dans le catch (la requête a échoué)
      clearTimeout(timeoutId);

      // Message d'erreur plus informatif avec détails du backend
      let errorMessage = error.message || t("contact.errorGeneric", "Erreur, réessayez.");

      // Si le message contient un code d'erreur du backend (format [CODE] message)
      if (error.message?.startsWith("[")) {
        // Garder le message tel quel (il contient déjà le code et les détails du backend)
        errorMessage = error.message;
        console.log("[Contact] 📋 Message d'erreur du backend conservé:", errorMessage);
      }
      // Si c'est une erreur d'abort (timeout frontend)
      else if (error.name === "AbortError") {
        errorMessage = t(
          "contact.errorTimeout",
          "La requête a pris trop de temps. Veuillez réessayer."
        );
        console.error("[Contact] ⏱️ TIMEOUT détecté - La requête a été annulée");
      }
      // Si c'est une erreur réseau (ERR_CONNECTION_REFUSED, etc.)
      else if (error.message?.includes("Failed to fetch") || error.name === "TypeError") {
        errorMessage = t(
          "contact.errorNetwork",
          "Impossible de contacter le serveur. Vérifiez votre connexion internet."
        );
        console.error("[Contact] ❌ Erreur réseau détectée - URL appelée:", apiUrl);
      }

      toast.error(t("contact.error", "Erreur"), {
        description: errorMessage,
      });
    } finally {
      console.log("[Contact] ✅ FINALLY REACHED - Réinitialisation isSubmitting à false");
      // Annuler le timeout si on est dans le finally (par sécurité)
      clearTimeout(timeoutId);

      // Utiliser directement setIsSubmitting au lieu de startTransition pour garantir l'exécution
      setIsSubmitting(false);
      console.log("[Contact] ✅ isSubmitting mis à false");
    }
  };

  const handleSyncAndSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    if (emailInput) {
      const value = emailInput.value;
      if (import.meta.env.DEV) {
        console.log("[Contact] 🧪 Sync email DOM → RHF avant validation", {
          domEmail: value,
          domEmailLength: value.length,
          domEmailJson: JSON.stringify(value),
        });
      }
      setValue("email", value, { shouldValidate: true, shouldDirty: true });
    }
    return handleSubmit(onSubmit)(event);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft" translate="no">
      <Seo
        title={t("seo.contact.title")}
        description={t("seo.contact.description")}
        canonical="https://rentanoo.com/contact"
      />
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("contact.title", "Nous contacter")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("contact.intro", "Vous préférez nous écrire ? Remplissez le formulaire ci-dessous.")}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("contact.formTitle", "Formulaire de contact")}</CardTitle>
              <CardDescription>
                {t("contact.formDescription", "Tous les champs marqués d'un astérisque (*) sont obligatoires.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSyncAndSubmit} className="space-y-6">
                {/* Honeypot */}
                <input
                  type="text"
                  {...register("website")}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Nom Prénom */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    {t("contact.fullName", "Nom Prénom")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    placeholder={t("contact.fullNamePlaceholder", "Votre nom complet")}
                    disabled={isSubmitting}
                    aria-invalid={errors.fullName ? "true" : "false"}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t("contact.email", "Adresse email")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder={t("contact.emailPlaceholder", "votre@email.com")}
                    disabled={isSubmitting}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Téléphone (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {t("contact.phone", "Numéro de téléphone")}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({t("contact.optional", "optionnel")})
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder={t("contact.phonePlaceholder", "+33 6 12 34 56 78")}
                    disabled={isSubmitting}
                    aria-invalid={errors.phone ? "true" : "false"}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                {/* Objet */}
                <div className="space-y-2">
                  <Label htmlFor="subject">
                    {t("contact.subject", "Objet")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    {...register("subject")}
                    placeholder={t("contact.subjectPlaceholder", "Objet de votre message")}
                    disabled={isSubmitting}
                    aria-invalid={errors.subject ? "true" : "false"}
                  />
                  {errors.subject && (
                    <p className="text-sm text-destructive">{errors.subject.message}</p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">
                    {t("contact.message", "Message")} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    placeholder={t("contact.messagePlaceholder", "Votre message...")}
                    rows={6}
                    disabled={isSubmitting}
                    aria-invalid={errors.message ? "true" : "false"}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>

                {/* Pièce jointe (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="attachment">
                    {t("contact.attachment", "Pièce jointe")}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({t("contact.optional", "optionnel")})
                    </span>
                  </Label>
                  <Input
                    id="attachment"
                    type="file"
                    {...register("attachment")}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    disabled={isSubmitting}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "contact.attachmentHint",
                      "Formats acceptés: PDF, JPG, PNG, DOC, DOCX (max 10MB)"
                    )}
                  </p>
                  {errors.attachment && (
                    <p className="text-sm text-destructive">{errors.attachment.message}</p>
                  )}
                </div>

                {/* Bouton Envoyer */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("contact.sending", "Envoi en cours...")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("contact.send", "Envoyer")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}


