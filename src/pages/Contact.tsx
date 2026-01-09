import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";

// Schéma de validation
const contactFormSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().optional(),
  subject: z.string().min(3, "L'objet doit contenir au moins 3 caractères"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
  attachment: z.instanceof(FileList).optional(),
  website: z.string().optional(), // Honeypot
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    // Vérification honeypot
    if (data.website) {
      // Bot détecté, ne rien faire
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("subject", data.subject);
      formData.append("message", data.message);
      
      if (data.phone) {
        formData.append("phone", data.phone);
      }

      // Ajouter la pièce jointe si présente
      if (data.attachment && data.attachment.length > 0) {
        const file = data.attachment[0];
        // Vérifier la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: t("contact.error", "Erreur"),
            description: t("contact.fileTooLarge", "Le fichier ne doit pas dépasser 10MB"),
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        formData.append("attachment", file);
      }

      // Déterminer l'URL de l'API selon l'environnement
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("contact.errorGeneric", "Erreur lors de l'envoi"));
      }

      toast({
        title: t("contact.success", "Message envoyé !"),
        description: t("contact.successDescription", "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais."),
      });

      reset();
    } catch (error: any) {
      console.error("Erreur envoi formulaire contact:", error);
      toast({
        title: t("contact.error", "Erreur"),
        description: error.message || t("contact.errorGeneric", "Erreur, réessayez."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Navbar />
      
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    {t("contact.phone", "Numéro de téléphone")} <span className="text-muted-foreground text-xs">({t("contact.optional", "optionnel")})</span>
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
                    {t("contact.attachment", "Pièce jointe")} <span className="text-muted-foreground text-xs">({t("contact.optional", "optionnel")})</span>
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
                    {t("contact.attachmentHint", "Formats acceptés: PDF, JPG, PNG, DOC, DOCX (max 10MB)")}
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

