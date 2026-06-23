import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Car, Eye, EyeOff, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GoogleIcon } from "@/components/ui/social-icons";
import { AUTH_CALLBACK_URL } from "@/lib/config";
import {
  buildAuthCallbackUrl,
  buildAuthLink,
  resolvePostAuthRedirect,
} from "@/lib/safeRedirectPath";

const registerSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z
    .string()
    .trim()
    .min(6, "Le numéro de téléphone est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectParam = searchParams.get("redirect");

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      const emailRedirectTo = buildAuthCallbackUrl(
        AUTH_CALLBACK_URL,
        redirectParam
      );
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone.trim(),
          },
        },
      });

      if (error) {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        if (authData.session) {
          toast({
            title: "Compte créé",
            description: "Bienvenue !",
          });
          navigate(resolvePostAuthRedirect(redirectParam));
        } else {
          setEmailConfirmationPending(true);
          setShowEmailForm(false);
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 group">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-lagoon rounded-2xl shadow-lagoon group-hover:shadow-soft transition-shadow">
              <Car className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
              Rentanoo
            </span>
          </Link>
        </div>

        <Card className="shadow-card">
          {emailConfirmationPending ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">Compte créé</CardTitle>
                <CardDescription className="text-base space-y-3 pt-2">
                  <span className="block">
                    Nous avons envoyé un email de confirmation.
                  </span>
                  <span className="block font-medium text-foreground">
                    Votre réservation est enregistrée.
                  </span>
                  <span className="block">
                    Après validation de votre email, vous reviendrez automatiquement
                    sur votre véhicule.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  onClick={() =>
                    navigate(buildAuthLink("/auth/login", redirectParam))
                  }
                  className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                >
                  J&apos;ai confirmé mon email
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Vérifiez votre boîte mail (et les spams) avant de continuer.
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">S&apos;inscrire</CardTitle>
                <CardDescription>
                  Créez votre compte Rentanoo et rejoignez la communauté
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Cart context banner */}
                    {redirectParam?.includes("/panier") && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium text-center">
                        Connecte-toi ou crée un compte pour envoyer ta demande de réservation — ton panier est sauvegardé.
                      </div>
                    )}

                    {/* Social Login Buttons */}
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 border-2 hover:bg-gray-50"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await supabase.auth.signInWithOAuth({
                              provider: "google",
                              options: {
                                redirectTo: buildAuthCallbackUrl(
                                  AUTH_CALLBACK_URL,
                                  redirectParam
                                ),
                              },
                            });
                          } catch (error) {
                            toast({
                              title: "Erreur",
                              description: "Erreur lors de l'inscription avec Google",
                              variant: "destructive",
                            });
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        data-testid="btn-google-register-header"
                        aria-label="Continuer avec Google (inscription)"
                      >
                        <GoogleIcon className="h-5 w-5 mr-3" />
                        {loading ? "Redirection..." : "Continuer avec Google"}
                      </Button>
                    </div>

                    {/* Toggle Email Form Button */}
                    <div className="relative mt-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowEmailForm(!showEmailForm)}
                          className="bg-background px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          OU PAR EMAIL
                          {showEmailForm ? (
                            <ChevronUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Email Form - Animated */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showEmailForm
                          ? "max-h-[800px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {showEmailForm && (
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Prénom</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Jean" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nom</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Dupont" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="votre@email.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Téléphone</FormLabel>
                                <FormControl>
                                  <Input
                                    type="tel"
                                    placeholder="+262 692 12 34 56"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mot de passe</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="••••••••"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmer le mot de passe</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showConfirmPassword ? "text" : "password"
                                      }
                                      placeholder="••••••••"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                      }
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                            disabled={loading}
                          >
                            {loading ? "Création du compte..." : "Créer mon compte"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </form>
                </Form>

                {/* Login Link */}
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground">
                    Déjà un compte ?{" "}
                    <Link
                      to={buildAuthLink("/auth/login", redirectParam)}
                      className="font-medium text-primary hover:underline"
                    >
                      Se connecter
                    </Link>
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
