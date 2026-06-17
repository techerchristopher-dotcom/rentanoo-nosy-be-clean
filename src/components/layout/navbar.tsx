import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, User, LogOut, LayoutDashboard, Shield, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { setCurrentLang } from "@/i18n/language";
import type { LangCode } from "@/types/dictionary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProfileService } from "@/services/supabase/profile";
import { User as UserType, UserRoleUtils } from "@/types";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { WhatsAppHeader } from "@/components/layout/WhatsAppHeader";
import { ExploreCategoriesButton } from "@/components/categories/ExploreCategoriesButton";

const LANGUAGES: Array<{ code: LangCode; flag: string; label: string }> = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
];

export function Navbar() {
  const { t, i18n } = useTranslation("common");
  const { user, signOut } = useAuth();
  const { count: cartCount, openCart, isOpen: isCartOpen } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Charger le profil utilisateur pour vérifier le rôle
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        setLoadingProfile(true);
        try {
          const { data: profile, error } = await ProfileService.getCurrentUserProfile();
          if (error) {
            console.error("Erreur lors du chargement du profil:", error);
            setUserProfile(null);
          } else {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error("Erreur inattendue:", error);
          setUserProfile(null);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Déconnexion réussie",
      description: "À bientôt sur Rentanoo !",
    });
    navigate("/");
  };

  // Vérifier les rôles de l'utilisateur
  const isOwner = !!userProfile && userProfile.roles.includes("owner");
  const isRenter = !!userProfile && userProfile.roles.includes("renter");

  // Vérifier si l'utilisateur est un locataire (peut devenir loueur)
  const canBecomeOwner = isRenter && !isOwner;

  // Gestion du changement de langue (pour mobile)
  const currentLang = (i18n.language as LangCode) || "fr";
  const handleLanguageChange = (lang: LangCode) => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang).catch((err) => {
      console.error("Erreur lors du changement de langue:", err);
    });
  };

  // Fonction pour générer les items du dropdown (réutilisée desktop + mobile)
  const renderUserMenuItems = () => (
    <>
      {/* Dashboard uniquement pour propriétaires */}
      {isOwner && (
        <DropdownMenuItem onClick={() => navigate("/me/dashboard")}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t('common.mon_dashboard', 'Mon Dashboard')}
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem onClick={() => navigate("/profile")}>
        <User className="mr-2 h-4 w-4" />
        {t('common.modifier_mon_profil', 'Modifier mon profil')}
      </DropdownMenuItem>
      
      {/* Mes réservations (locataire) */}
      <DropdownMenuItem asChild>
        <Link to="/me/renter/bookings">
          <User className="mr-2 h-4 w-4" />
          {t('common.mes_rservations', 'Mes réservations')}
        </Link>
      </DropdownMenuItem>

      {/* Items Owner-only */}
      {isOwner && (
        <>
          <DropdownMenuItem onClick={() => navigate("/me/owner/vehicles")}>
            <Car className="mr-2 h-4 w-4" />
            {t('common.mes_vhicules', 'Mes véhicules')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/me/owner/bookings")}>
            <User className="mr-2 h-4 w-4" />
            {t('common.demandes_de_location', 'Demandes de location')}
          </DropdownMenuItem>
        </>
      )}

      {!loadingProfile &&
        userProfile &&
        UserRoleUtils.isAdmin(userProfile) && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <Shield className="mr-2 h-4 w-4" />
            {t("common.admin", "Admin")}
          </DropdownMenuItem>
        )}
    </>
  );

  return (
    <>
      {/* Header WhatsApp - Sticky en haut */}
      <WhatsAppHeader />
      
      {/* Navbar principale */}
      <header className="border-b bg-gradient-to-r from-background to-primary-soft/20 backdrop-blur-sm sticky top-0 md:top-[45px] z-50" translate="no">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src="/brand/rentanoo-logo.svg" 
              alt="Rentanoo" 
              width={100}
              height={30}
              className="h-8 w-auto"
            />
          </Link>

          {/* User Menu / Auth + CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Panier multi-réservation */}
            <Button
              id="navbar-cart-icon"
              variant="ghost"
              size="sm"
              className={cn(
                "relative px-2",
                cartCount > 0 && !isCartOpen && "animate-cart-glow"
              )}
              onClick={openCart}
              aria-label="Mon panier"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="cart-badge absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Explorer (catégories showcase) */}
            <ExploreCategoriesButton />

            {user ? (
              <div className="flex items-center space-x-3">
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-medium hover:bg-black/5"
                      onClick={() => setUserMenuOpen(true)}
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                    >
                      {t('common.mon_espace', 'Mon espace')}
                    </Button>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 h-auto hover:bg-black/5 focus:outline-none"
                        aria-haspopup="menu"
                        data-testid="user-button"
                      >
                        <UserAvatar size={28} showName={true} />
                      </Button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{t('common.utilisateur_connect', 'Utilisateur connecté')}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {renderUserMenuItems()}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common.se_dconnecter', 'Se déconnecter')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth/login">
                  <Button variant="ghost">{t("nav.login")}</Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="bg-gradient-lagoon hover:opacity-90 shadow-lagoon">
                    Inscription
                  </Button>
                </Link>
              </div>
            )}
            
            {/* CTA - Devenir loueur (désactivé pour les locataires, badge \"Bientôt disponible\") */}
            {canBecomeOwner && (
              <div className="inline-flex flex-col items-center gap-0.5">
                <div className="text-[11px] font-medium text-primary/80">
                  {t('common.comingSoon', 'Bientôt disponible')}
                </div>
                <Button
                  type="button"
                  disabled
                  aria-disabled="true"
                  tabIndex={-1}
                  className="bg-gradient-lagoon text-white shadow-lagoon/70 transition-all duration-300 font-medium opacity-70 cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  ⭐ {t('common.devenir_loueur', 'Devenir loueur')}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile User Menu - Mon espace */}
          <div className="md:hidden flex items-center gap-1">
            {/* Panier multi-réservation */}
            <Button
              id="navbar-cart-icon-mobile"
              variant="ghost"
              size="sm"
              className={cn(
                "relative px-2",
                cartCount > 0 && !isCartOpen && "animate-cart-glow"
              )}
              onClick={openCart}
              aria-label="Mon panier"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="cart-badge absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>

            {/* Explorer (catégories showcase) — icône seule sur mobile */}
            <ExploreCategoriesButton iconOnlyOnMobile className="px-2" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium h-9 px-3"
                  aria-label={t('common.mon_espace', 'Mon espace')}
                >
                  {t('common.mon_espace', 'Mon espace')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    {/* Header avec email */}
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{t('common.utilisateur_connect', 'Utilisateur connecté')}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Items de navigation */}
                    {renderUserMenuItems()}
                    
                    {/* CTA Devenir loueur (si applicable) */}
                    {canBecomeOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <div className="text-[11px] font-medium text-primary/80 mb-1">
                            {t('common.comingSoon', 'Bientôt disponible')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ⭐ {t('common.devenir_loueur', 'Devenir loueur')}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Sélecteur de langue */}
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Langue</p>
                      <div className="flex flex-wrap gap-1">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={cn(
                              "px-2 py-1 text-xs rounded-md border transition-colors",
                              currentLang === lang.code
                                ? "bg-accent border-accent-foreground/20"
                                : "border-transparent hover:bg-muted"
                            )}
                            aria-selected={currentLang === lang.code}
                          >
                            <span className="mr-1" role="img" aria-hidden="true">
                              {lang.flag}
                            </span>
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Déconnexion */}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common.se_dconnecter', 'Se déconnecter')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/auth/login">
                        {t("nav.login")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth/register">
                        Inscription
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Langue</p>
                      <div className="flex flex-wrap gap-1">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={cn(
                              "px-2 py-1 text-xs rounded-md border transition-colors",
                              currentLang === lang.code
                                ? "bg-accent border-accent-foreground/20"
                                : "border-transparent hover:bg-muted"
                            )}
                            aria-selected={currentLang === lang.code}
                          >
                            <span className="mr-1" role="img" aria-hidden="true">
                              {lang.flag}
                            </span>
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}