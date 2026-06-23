import "@/styles/modal-animations.css";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Car, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
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

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const demoAccounts = [
  { email: "renter@demo.fr", password: "demo", role: "Locataire" },
  { email: "owner@demo.fr", password: "demo", role: "Propriétaire" },
  { email: "admin@demo.fr", password: "demo", role: "Administrateur" },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        const friendlyMessage =
          error.message?.toLowerCase().includes("invalid login") ||
          error.message?.toLowerCase().includes("invalid_credentials")
            ? "Identifiants invalides. Vérifiez votre email, votre mot de passe, ou réinitialisez votre mot de passe."
            : error.message;
        toast({
          title: "Erreur de connexion",
          description: friendlyMessage,
          variant: "destructive",
        });
        setShowForgotPassword(true);
        forgotPasswordForm.setValue("email", data.email);
        return;
      }

      if (authData.user) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur Rentanoo !",
        });
        navigate(resolvePostAuthRedirect(searchParams.get("redirect")));
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

  const handleDemoLogin = (email: string, password: string) => {
    form.setValue("email", email);
    form.setValue("password", password);
    form.handleSubmit(onSubmit)();
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "📧 Email envoyé !",
        description: `Un lien de réinitialisation a été envoyé à ${data.email}. Vérifiez votre boîte de réception.`,
      });
      setShowForgotPassword(false);
      forgotPasswordForm.reset();
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
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Se connecter</CardTitle>
            <CardDescription>
              Accédez à votre compte Rentanoo
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Cart context banner */}
            {searchParams.get("redirect")?.includes("/panier") && (
              <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium text-center">
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
                          searchParams.get("redirect")
                        ),
                      },
                    });
                  } catch (error) {
                    toast({
                      title: "Erreur",
                      description: "Erreur lors de la connexion avec Google",
                      variant: "destructive",
                    });
                    setLoading(false);
                  }
                }}
                disabled={loading}
                data-testid="btn-google-login-header"
                aria-label="Continuer avec Google (connexion)"
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
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showEmailForm ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showEmailForm && (
                <div className="space-y-4 pt-4">
                  {!showForgotPassword ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                        {/* Forgot Password Link */}
                        <div className="flex justify-between items-center">
                          <div></div>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto font-normal text-sm text-primary hover:underline"
                            onClick={() => {
                              setShowForgotPassword(true);
                              // Copie l'email du formulaire de connexion vers le formulaire de réinitialisation
                              if (form.getValues("email")) {
                                forgotPasswordForm.setValue("email", form.getValues("email"));
                              }
                            }}
                          >
                            Mot de passe oublié ?
                          </Button>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                          disabled={loading}
                        >
                          {loading ? "Connexion..." : "Se connecter"}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    /* Forgot Password Form - Animated */
                    <div className="animate-fade-in">
                      <Form {...forgotPasswordForm}>
                        <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                          <div className="text-center border-b pb-4 mb-4">
                            <h3 className="text-lg font-semibold text-primary">Réinitialiser le mot de passe</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                              Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
                            </p>
                          </div>
                          
                          <FormField
                            control={forgotPasswordForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adresse email</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Entrez votre email"
                                    className="h-12"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex space-x-3 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 h-12"
                              onClick={() => {
                                setShowForgotPassword(false);
                                forgotPasswordForm.reset();
                              }}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 h-12 bg-gradient-lagoon hover:opacity-90"
                              disabled={!forgotPasswordForm.formState.isValid}
                            >
                              Envoyer le lien
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}

                  {/* Demo Accounts - Moved inside email form */}
                  {!showForgotPassword && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 text-center">
                        Comptes de démonstration :
                      </p>
                      <div className="grid gap-1">
                        {demoAccounts.map((account) => (
                          <Button
                            key={account.email}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDemoLogin(account.email, account.password)}
                            className="justify-start text-xs h-8"
                          >
                            <span className="font-medium">{account.role}</span>
                            <span className="ml-auto text-muted-foreground text-xs">{account.email}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Register Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  to={buildAuthLink("/auth/register", searchParams.get("redirect"))}
                  className="font-medium text-primary hover:underline"
                >
                  S'inscrire
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}