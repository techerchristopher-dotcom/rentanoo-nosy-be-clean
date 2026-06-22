import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

export function Footer() {
  const {
    t: t,
  } = useTranslation('common');

  return (
    <footer className="bg-gradient-to-r from-primary/5 to-primary-soft/10 border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-2 md:mb-4">
              <Link to="/">
                <img
                  src="/brand/rentanoo-logo.svg"
                  alt="Rentanoo"
                  width={100}
                  height={30}
                  className="h-6 md:h-7 w-auto"
                  loading="lazy"
                />
              </Link>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 max-w-md">
              {t(
                "footer.description",
                "Plateforme de location à Nosy Be : scooter, moto, voiture et hébergement. Réservation 100 % en ligne."
              )}
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>
                  {t("footer.location", "Nosy Be, Madagascar")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-2 md:mb-4 text-sm md:text-base">{t('common.navigation')}</h3>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
              <li>
                <Link to="/?cat=scooter" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.nav.scooters', 'Scooters & motos')}</Link>
              </li>
              <li>
                <Link to="/?cat=car" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.nav.cars', 'Voitures')}</Link>
              </li>
              <li>
                <Link to="/?cat=accommodation" className="text-muted-foreground hover:text-primary transition-colors">{t('footer.nav.accommodation', 'Hébergements')}</Link>
              </li>
              <li>
                <Link to="/auth/register" className="text-muted-foreground hover:text-primary transition-colors">{t('common.devenir_propritaire')}</Link>
              </li>
              <li>
                <Link to="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">{t('common.se_connecter')}</Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-2 md:mb-4 text-sm md:text-base">{t('common.lgal')}</h3>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
              <li>
                <Link to="/sinistre-caution" className="text-muted-foreground hover:text-primary transition-colors">{t('common.sinistre_caution', 'Sinistre & caution')}</Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.conditions_dutilisation')}</Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.politique_de_confidentialit')}</Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.mentions_lgales')}</Link>
              </li>
              <li>
                <Link to="/politique-annulation" className="text-muted-foreground hover:text-primary transition-colors">{t('common.politique_annulation', "Politique d'annulation et de remboursement")}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-4 md:mt-8 pt-4 md:pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-xs md:text-sm text-muted-foreground">
            {t(
              "footer.copyright",
              "© 2025 RENTANOO. Tous droits réservés."
            )}
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="text-xs text-muted-foreground">
              {t(
                "footer.madeWith",
                "Made with ❤️ in Nosy Be"
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}