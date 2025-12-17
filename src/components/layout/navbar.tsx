import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, Menu, X, User, LogOut, Plus, Settings, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { ProfileService } from "@/services/supabase/profile";
import { User as UserType } from "@/types";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export function Navbar() {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

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
      description: "À bientôt sur MayCar !",
    });
    navigate("/");
  };

  // Vérifier les rôles de l'utilisateur
  const isOwner = !!userProfile && userProfile.roles.includes("owner");
  const isRenter = !!userProfile && userProfile.roles.includes("renter");

  // Vérifier si l'utilisateur est un locataire (peut devenir loueur)
  const canBecomeOwner = isRenter && !isOwner;


  return (
    <header className="border-b bg-gradient-to-r from-background to-primary-soft/20 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-lagoon rounded-2xl shadow-lagoon group-hover:shadow-soft transition-shadow">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
              MayCar
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors"
            >
              {t("nav.home")}
            </Link>
            <Link 
              to="/dictionary" 
              className="text-foreground hover:text-primary transition-colors"
            >
              {t("nav.dictionary")}
            </Link>
            {user ? (
              <>
                {/* Lien Mes réservations pour locataire */}
                {isRenter && (
                  <Link 
                    to="/me/renter/bookings" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Mes réservations
                  </Link>
                )}
                
                {/* Lien Demandes de location pour propriétaire */}
                {isOwner && (
                  <Link 
                    to="/me/owner/bookings" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Demandes de location
                  </Link>
                )}
                
                {/* Lien Mes véhicules pour propriétaire */}
                {isOwner && (
                  <Link 
                    to="/me/owner/vehicles" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Mes véhicules
                  </Link>
                )}
              </>
            ) : null}
          </nav>

          {/* User Menu / Auth + CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {user ? (
              <div className="flex items-center space-x-3">
                <DropdownMenu>
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
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{t('common.utilisateur_connect', 'Utilisateur connecté')}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
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

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {/* Mobile Navigation Links */}
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t("nav.home")}
              </Link>
              <Link 
                to="/dictionary" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t("nav.dictionary")}
              </Link>
              
              {/* Language Switcher Mobile */}
              <div className="pt-2 pb-2 border-t">
                <LanguageSwitcher />
              </div>
              
              {/* CTA Mobile - Devenir loueur (désactivé pour les locataires, badge \"Bientôt disponible\") */}
              {canBecomeOwner && (
                <div className="space-y-1">
                  <div className="inline-flex items-center justify-center rounded-full bg-primary-soft/20 text-primary text-[11px] font-medium px-3 py-0.5">
                    {t('common.comingSoon', 'Bientôt disponible')}
                  </div>
                  <Button 
                    type="button"
                    disabled
                    aria-disabled="true"
                    tabIndex={-1}
                    className="w-full bg-gradient-lagoon shadow-lagoon/70 text-white font-medium opacity-70 cursor-not-allowed"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    ⭐ {t('common.devenir_loueur', 'Devenir loueur')}
                  </Button>
                </div>
              )}
              
              {user ? (
                <>
                  <Link 
                    to="/me/renter/bookings" 
                    className="text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('common.mes_rservations', 'Mes réservations')}
                  </Link>
                  {isOwner && (
                    <Link 
                      to="/me/owner/vehicles" 
                      className="text-foreground hover:text-primary transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('common.mes_vhicules', 'Mes véhicules')}
                    </Link>
                  )}
                  
                  <div className="pt-3 border-t space-y-3">
                    <div>
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{t('common.utilisateur_connect', 'Utilisateur connecté')}</p>
                    </div>
                    {/* Dashboard uniquement pour propriétaires */}
                    {userProfile?.roles.includes('owner') && (
                      <Link to="/me/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {t('common.mon_dashboard', 'Mon Dashboard')}
                        </Button>
                      </Link>
                    )}
                    
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="mr-2 h-4 w-4" />
                        {t('common.modifier_mon_profil', 'Modifier mon profil')}
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout}
                      className="w-full justify-start text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common.se_dconnecter', 'Se déconnecter')}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 pt-3 border-t">
                  <Link to="/auth/login" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon">
                      Inscription
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}