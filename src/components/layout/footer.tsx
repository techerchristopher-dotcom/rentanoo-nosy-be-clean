import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Car, MapPin, Mail, Phone } from "lucide-react";

export function Footer() {
  const {
    t: t,
  } = useTranslation('common');

  return (
    <footer className="bg-gradient-to-r from-primary/5 to-primary-soft/10 border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-lagoon rounded-2xl shadow-lagoon">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
                {t("footer.brand", "RENTANOO")}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              {t(
                "footer.description",
                "Agence de location de scooters à Nosy Be. Réservation 100 % en ligne, rapide et simple."
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
            <h3 className="font-semibold text-foreground mb-4">{t('common.navigation')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">{t('common.rechercher_un_vhicule')}</Link>
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
            <h3 className="font-semibold text-foreground mb-4">{t('common.lgal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.conditions_dutilisation')}</Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.politique_de_confidentialit')}</Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">{t('common.mentions_lgales')}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
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