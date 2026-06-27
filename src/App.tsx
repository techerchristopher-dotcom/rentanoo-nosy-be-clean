import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ExchangeRateProvider } from "@/contexts/ExchangeRateContext";
import { WhatsAppContactProvider } from "@/contexts/WhatsAppContactContext";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CategorySuggestionModal } from "@/components/cart/CategorySuggestionModal";
import { AddedToCartModal } from "@/components/cart/AddedToCartModal";
import { CategoryShowcaseProvider } from "@/hooks/useCategoryShowcase";
import { CategoryShowcaseModal } from "@/components/categories/CategoryShowcaseModal";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { trackPageViewEvent } from "@/lib/whatsappAnalytics";
import { trackMetaPageView } from "@/lib/metaPixel";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navbar } from "@/components/layout/navbar";
import { WhatsAppFloatingButton } from "@/components/layout/WhatsAppFloatingButton";
import { ClientProfileCompletionGuard } from "@/components/ClientProfileCompletionGuard";

// Home : import direct pour premier paint rapide
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Routes non-Home : lazy-loaded pour réduire le bundle initial
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Callback = lazy(() => import("./pages/auth/Callback"));
const Profile = lazy(() => import("./pages/Profile"));
const ClientOnboarding = lazy(() => import("./pages/onboarding/ClientOnboarding"));
const ProfileTest = lazy(() => import("./pages/ProfileTest"));
const BookingDiscussion = lazy(() => import("./pages/booking/BookingDiscussion"));
const CartSubmit = lazy(() => import("./pages/cart/CartSubmit"));
const CartConfirmation = lazy(() => import("./pages/cart/CartConfirmation"));
const MessageToOwners = lazy(() => import("./pages/booking/MessageToOwners"));
const Legal = lazy(() => import("./pages/legal/Legal"));
const PolitiqueAnnulation = lazy(() => import("./pages/legal/PolitiqueAnnulation"));
const SinistreCaution = lazy(() => import("./pages/sinistre-caution/SinistreCaution"));
const Contact = lazy(() => import("./pages/Contact"));
const MeteoNosyBePage = lazy(() => import("./pages/seo/MeteoNosyBePage"));
const TauxChangeMadagascarPage = lazy(() => import("./pages/seo/TauxChangeMadagascarPage"));
const VolsNosyBePage = lazy(() => import("./pages/seo/VolsNosyBePage"));
const LocationScooterNosyBePage = lazy(() => import("./pages/seo/LocationScooterNosyBePage"));
const LocationMotoNosyBePage = lazy(() => import("./pages/seo/LocationMotoNosyBePage"));
const LocationQuadNosyBePage = lazy(() => import("./pages/seo/LocationQuadNosyBePage"));
const LocationVoitureNosyBePage = lazy(() => import("./pages/seo/LocationVoitureNosyBePage"));
const LocationVacancesNosyBePage = lazy(() => import("./pages/seo/LocationVacancesNosyBePage"));
const LocationHebergementNosyBePage = lazy(() => import("./pages/seo/LocationHebergementNosyBePage"));
const LocationAppartementNosyBePage = lazy(() => import("./pages/seo/LocationAppartementNosyBePage"));
const LocationVillaNosyBePage = lazy(() => import("./pages/seo/LocationVillaNosyBePage"));
const LocationVillaBordDeMerNosyBePage = lazy(() => import("./pages/seo/LocationVillaBordDeMerNosyBePage"));
const LocationVillaPiscineNosyBePage = lazy(() => import("./pages/seo/LocationVillaPiscineNosyBePage"));
const LocationBungalowNosyBePage = lazy(() => import("./pages/seo/LocationBungalowNosyBePage"));
const Location4x4NosyBePage = lazy(() => import("./pages/seo/Location4x4NosyBePage"));
const LocationMinibusNosyBePage = lazy(() => import("./pages/seo/LocationMinibusNosyBePage"));
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const BlogPost = lazy(() => import("./pages/blog/BlogPost"));

// Autres routes lourdes (déjà lazy)
const VehicleDetails = lazy(() => import("./pages/vehicles/VehicleDetails"));
const MotoVehicleDetails = lazy(() => import("./pages/vehicles/MotoVehicleDetails"));
const AccommodationDetails = lazy(() => import("./pages/vehicles/AccommodationDetails"));
const RenterBookings = lazy(() => import("./pages/renter/RenterBookings"));
const PaymentSuccess = lazy(() => import("./pages/renter/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/renter/PaymentCancel"));
const Dashboard = lazy(() => import("./pages/owner/Dashboard"));
const OwnerVehicles = lazy(() => import("./pages/owner/OwnerVehicles"));
const OwnerBookings = lazy(() => import("./pages/owner/OwnerBookings"));
const OwnerBookingRequests = lazy(() => import("./pages/owner/OwnerBookingRequests"));
const OwnerBookingDiscussion = lazy(() => import("./pages/owner/OwnerBookingDiscussion"));
const ManageVehicle = lazy(() => import("./pages/owner/ManageVehicle"));
const AddVehicle = lazy(() => import("./pages/owner/AddVehicle"));
const AddMotoPlaceholder = lazy(() => import("./pages/owner/AddMotoPlaceholder"));
const RentMyCarLanding = lazy(() => import("./pages/owner/RentMyCarLanding"));
const RentMyCarRegister = lazy(() => import("./pages/owner/RentMyCarRegister"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBookingNew = lazy(() => import("./pages/admin/bookings/AdminBookingNew"));
const AdminBookingDetail = lazy(() => import("./pages/admin/bookings/AdminBookingDetail"));
const AdminBookingsList = lazy(() => import("./pages/admin/bookings/AdminBookingsList"));
const AdminDrafts = lazy(() => import("./pages/admin/drafts/AdminDrafts"));
const AdminPlanning = lazy(() => import("./pages/admin/planning/AdminPlanning"));
const AdminRevenue = lazy(() => import("./pages/admin/revenue/AdminRevenue"));
const AdminPlaceholderUsers = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderUsers }))
);
const AdminPlaceholderVehicles = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderVehicles }))
);
const AdminPlaceholderPayments = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderPayments }))
);
const FleetList = lazy(() => import("./pages/admin/fleet/FleetList"));
const FleetForm = lazy(() => import("./pages/admin/fleet/FleetForm"));
const FleetDetail = lazy(() => import("./pages/admin/fleet/FleetDetail"));
const VehicleStateForm = lazy(() => import("./pages/admin/fleet/VehicleStateForm"));
const PartsList = lazy(() => import("./pages/admin/parts/PartsList"));
const PartForm = lazy(() => import("./pages/admin/parts/PartForm"));
const PartDetail = lazy(() => import("./pages/admin/parts/PartDetail"));
const StockMovementsList = lazy(() => import("./pages/admin/parts/StockMovementsList"));
const WorkshopList = lazy(() => import("./pages/admin/workshop/WorkshopList"));
const RepairForm = lazy(() => import("./pages/admin/workshop/RepairForm"));
const RepairDetail = lazy(() => import("./pages/admin/workshop/RepairDetail"));
const ReportsDashboard = lazy(() => import("./pages/admin/reports/ReportsDashboard"));
const SalesList = lazy(() => import("./pages/admin/sales/SalesList"));
const SaleForm = lazy(() => import("./pages/admin/sales/SaleForm"));
const SaleDetail = lazy(() => import("./pages/admin/sales/SaleDetail"));
const SuppliersList = lazy(() => import("./pages/admin/suppliers/SuppliersList"));
const SupplierForm = lazy(() => import("./pages/admin/suppliers/SupplierForm"));
const MaintenancePage = lazy(() => import("./pages/admin/maintenance/MaintenancePage"));
const AdminExchangeSettings = lazy(() => import("./pages/admin/settings/AdminExchangeSettings"));
const AdminWhatsAppSettings = lazy(() => import("./pages/admin/settings/AdminWhatsAppSettings"));
const AdminPricingSettings = lazy(() => import("./pages/admin/settings/AdminPricingSettings"));
const AdminSiteAnalytics = lazy(() => import("./pages/admin/analytics/AdminSiteAnalytics"));
const Checking = lazy(() => import("./pages/Checking"));
const CheckinReturnPage = lazy(() => import("./pages/checkin-return/[bookingId]"));
const DictionaryIndex = lazy(() => import("./pages/dictionary/DictionaryIndex"));
const DictionaryEntryPage = lazy(() => import("./pages/dictionary/DictionaryEntry"));
const PickerDemo = lazy(() => import("./pages/PickerDemo").then(m => ({ default: m.PickerDemo })));
const AirportServicesDemo = lazy(() => import("./pages/AirportServicesDemo"));
const SimpleTest = lazy(() => import("./pages/SimpleTest"));
// DEV ONLY - Diagnostic i18n
const I18nDebug = lazy(() => import("./pages/__I18nDebug"));

const queryClient = new QueryClient();

/**
 * Envoie un page_view GA4 + un fbq PageView Meta à chaque changement de route (SPA).
 * La 1re page est déjà envoyée par gtag('config') / le snippet Meta dans index.html.
 */
function RouteChangeTracker() {
  const location = useLocation();
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    trackPageViewEvent(location.pathname + location.search, document.title);
    trackMetaPageView();
  }, [location.pathname, location.search]);
  return null;
}

// React Router ne réinitialise pas le scroll par défaut : sans ça, naviguer
// vers une nouvelle page (ex: clic "Lire" sur un article) garde la position
// de scroll de la page précédente. On laisse les ancres (#search-results)
// gérer leur propre scroll ailleurs.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // Prevent the browser from auto-restoring the scroll position on refresh /
  // back-navigation — we handle scroll positioning ourselves.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ExchangeRateProvider>
        <WhatsAppContactProvider>
        <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CategoryShowcaseProvider>
            <CartDrawer />
            <CategorySuggestionModal />
            <AddedToCartModal />
            <RouteChangeTracker />
            <ScrollToTop />
            <ClientProfileCompletionGuard />
            {/* Wrapper to allow a fixed dev language switcher on all pages */}
            <div className="relative">
              {/* Dev-only floating language switcher, visible on all pages */}
              <div className="fixed bottom-4 left-4 md:left-auto md:right-4 z-50">
                <LanguageSwitcher />
              </div>
              <WhatsAppFloatingButton />
              <CategoryShowcaseModal />
              {/* Navbar - Rendu directement pour éviter les problèmes de ErrorBoundary */}
              <Navbar />
              <Routes>
            {/* Home : chargement immédiat */}
            <Route path="/" element={<Index />} />
            {/* Routes non-Home : lazy avec Suspense */}
            <Route path="/auth/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/auth/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
            <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><Callback /></Suspense>} />
            <Route path="/onboarding/client" element={<Suspense fallback={<PageLoader />}><ClientOnboarding /></Suspense>} />
            <Route path="/profile" element={
              <Suspense fallback={<PageLoader />}>
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              </Suspense>
            } />
            <Route path="/profile-test" element={<Suspense fallback={<PageLoader />}><ProfileTest /></Suspense>} />
            <Route path="/vehicle/:license/booking/discussion" element={<Suspense fallback={<PageLoader />}><BookingDiscussion /></Suspense>} />
            <Route path="/moto/:license/booking/discussion" element={<Suspense fallback={<PageLoader />}><BookingDiscussion /></Suspense>} />
            <Route path="/hebergement/:license/booking/discussion" element={<Suspense fallback={<PageLoader />}><BookingDiscussion /></Suspense>} />
            <Route path="/booking/message" element={<Suspense fallback={<PageLoader />}><MessageToOwners /></Suspense>} />
            <Route path="/panier/soumettre" element={<Suspense fallback={<PageLoader />}><CartSubmit /></Suspense>} />
            <Route path="/panier/confirmation" element={<Suspense fallback={<PageLoader />}><CartConfirmation /></Suspense>} />
            <Route path="/legal" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
            <Route path="/politique-annulation" element={<Suspense fallback={<PageLoader />}><PolitiqueAnnulation /></Suspense>} />
            <Route path="/sinistre-caution" element={<Suspense fallback={<PageLoader />}><SinistreCaution /></Suspense>} />
            <Route path="/meteo-nosy-be" element={<Suspense fallback={<PageLoader />}><MeteoNosyBePage /></Suspense>} />
            <Route path="/taux-change-euro-ariary-madagascar" element={<Suspense fallback={<PageLoader />}><TauxChangeMadagascarPage /></Suspense>} />
            <Route path="/vols-aeroport-nosy-be" element={<Suspense fallback={<PageLoader />}><VolsNosyBePage /></Suspense>} />
            <Route path="/location-scooter-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationScooterNosyBePage /></Suspense>} />
            <Route path="/location-moto-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationMotoNosyBePage /></Suspense>} />
            <Route path="/location-quad-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationQuadNosyBePage /></Suspense>} />
            <Route path="/location-voiture-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationVoitureNosyBePage /></Suspense>} />
            <Route path="/location-hebergement-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationHebergementNosyBePage /></Suspense>} />
            <Route path="/location-vacances-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationVacancesNosyBePage /></Suspense>} />
            <Route path="/location-appartement-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationAppartementNosyBePage /></Suspense>} />
            <Route path="/location-villa-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationVillaNosyBePage /></Suspense>} />
            <Route path="/location-villa-bord-de-mer-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationVillaBordDeMerNosyBePage /></Suspense>} />
            <Route path="/location-villa-piscine-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationVillaPiscineNosyBePage /></Suspense>} />
            <Route path="/location-bungalow-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationBungalowNosyBePage /></Suspense>} />
            <Route path="/location-4x4-nosy-be" element={<Suspense fallback={<PageLoader />}><Location4x4NosyBePage /></Suspense>} />
            <Route path="/location-minibus-nosy-be" element={<Suspense fallback={<PageLoader />}><LocationMinibusNosyBePage /></Suspense>} />
            <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogIndex /></Suspense>} />
            <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogPost /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
            
            {/* Routes non critiques (lazy-loaded) */}
            <Route path="/vehicle/:license" element={
              <Suspense fallback={<PageLoader />}>
                <VehicleDetails />
              </Suspense>
            } />
            <Route path="/moto/:license" element={
              <Suspense fallback={<PageLoader />}>
                <MotoVehicleDetails />
              </Suspense>
            } />
            <Route path="/hebergement/:license" element={
              <Suspense fallback={<PageLoader />}>
                <AccommodationDetails />
              </Suspense>
            } />
            <Route path="/me/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/me/renter/bookings" element={
              <Suspense fallback={<PageLoader />}>
                <RenterBookings />
              </Suspense>
            } />
            <Route path="/success" element={
              <Suspense fallback={<PageLoader />}>
                <PaymentSuccess />
              </Suspense>
            } />
            <Route path="/cancel" element={
              <Suspense fallback={<PageLoader />}>
                <PaymentCancel />
              </Suspense>
            } />
            <Route path="/me/owner/vehicles" element={
              <Suspense fallback={<PageLoader />}>
                <OwnerVehicles />
              </Suspense>
            } />
            <Route path="/me/owner/bookings" element={
              <Suspense fallback={<PageLoader />}>
                <OwnerBookings />
              </Suspense>
            } />
            <Route path="/me/owner/requests" element={
              <Suspense fallback={<PageLoader />}>
                <OwnerBookingRequests />
              </Suspense>
            } />
            <Route path="/me/owner/requests/:conversationId/discussion" element={
              <Suspense fallback={<PageLoader />}>
                <OwnerBookingDiscussion />
              </Suspense>
            } />
            <Route path="/me/owner/vehicles/add" element={
              <Suspense fallback={<PageLoader />}>
                <AddVehicle />
              </Suspense>
            } />
            <Route path="/me/owner/vehicles/add-moto" element={
              <Suspense fallback={<PageLoader />}>
                <AddMotoPlaceholder />
              </Suspense>
            } />
            <Route path="/me/owner/vehicles/:vehicleId/manage" element={
              <Suspense fallback={<PageLoader />}>
                <ManageVehicle />
              </Suspense>
            } />
            <Route path="/rent-my-car" element={
              <Suspense fallback={<PageLoader />}>
                <RentMyCarLanding />
              </Suspense>
            } />
            <Route path="/rent-my-car/register" element={
              <Suspense fallback={<PageLoader />}>
                <RentMyCarRegister />
              </Suspense>
            } />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminLayout />
                </Suspense>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                }
              />
              <Route
                path="users"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPlaceholderUsers />
                  </Suspense>
                }
              />
              <Route
                path="vehicles"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPlaceholderVehicles />
                  </Suspense>
                }
              />
              <Route
                path="bookings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminBookingsList />
                  </Suspense>
                }
              />
              <Route
                path="bookings/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminBookingNew />
                  </Suspense>
                }
              />
              <Route
                path="bookings/:bookingId"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminBookingDetail />
                  </Suspense>
                }
              />
              <Route
                path="drafts"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminDrafts />
                  </Suspense>
                }
              />
              <Route
                path="planning"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPlanning />
                  </Suspense>
                }
              />
              <Route
                path="payments"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPlaceholderPayments />
                  </Suspense>
                }
              />
              <Route
                path="revenue"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminRevenue />
                  </Suspense>
                }
              />
              <Route
                path="settings/exchange"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminExchangeSettings />
                  </Suspense>
                }
              />
              <Route
                path="settings/whatsapp"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminWhatsAppSettings />
                  </Suspense>
                }
              />
              <Route
                path="settings/pricing"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPricingSettings />
                  </Suspense>
                }
              />
              <Route
                path="fleet"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FleetList />
                  </Suspense>
                }
              />
              <Route
                path="fleet/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FleetForm />
                  </Suspense>
                }
              />
              <Route
                path="fleet/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FleetDetail />
                  </Suspense>
                }
              />
              <Route
                path="fleet/:id/edit"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FleetForm />
                  </Suspense>
                }
              />
              <Route
                path="fleet/:id/state/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <VehicleStateForm />
                  </Suspense>
                }
              />
              <Route
                path="parts"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PartsList />
                  </Suspense>
                }
              />
              <Route
                path="parts/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PartForm />
                  </Suspense>
                }
              />
              <Route
                path="parts/movements"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <StockMovementsList />
                  </Suspense>
                }
              />
              <Route
                path="parts/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PartDetail />
                  </Suspense>
                }
              />
              <Route
                path="parts/:id/edit"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PartForm />
                  </Suspense>
                }
              />
              <Route
                path="workshop"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WorkshopList />
                  </Suspense>
                }
              />
              <Route
                path="workshop/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RepairForm />
                  </Suspense>
                }
              />
              <Route
                path="workshop/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RepairDetail />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ReportsDashboard />
                  </Suspense>
                }
              />
              <Route
                path="analytics/site"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminSiteAnalytics />
                  </Suspense>
                }
              />
              <Route
                path="sales"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SalesList />
                  </Suspense>
                }
              />
              <Route
                path="sales/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SaleForm />
                  </Suspense>
                }
              />
              <Route
                path="sales/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SaleDetail />
                  </Suspense>
                }
              />
              <Route
                path="suppliers"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SuppliersList />
                  </Suspense>
                }
              />
              <Route
                path="suppliers/new"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SupplierForm />
                  </Suspense>
                }
              />
              <Route
                path="suppliers/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SupplierForm />
                  </Suspense>
                }
              />
              <Route
                path="maintenance"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MaintenancePage />
                  </Suspense>
                }
              />
            </Route>
            <Route path="/checking/:bookingId" element={
              <Suspense fallback={<PageLoader />}>
                <Checking />
              </Suspense>
            } />
            <Route path="/checkin-return/:bookingId" element={
              <Suspense fallback={<PageLoader />}>
                <CheckinReturnPage />
              </Suspense>
            } />
            <Route path="/dictionary" element={
              <Suspense fallback={<PageLoader />}>
                <DictionaryIndex />
              </Suspense>
            } />
            <Route path="/dictionary/:id" element={
              <Suspense fallback={<PageLoader />}>
                <DictionaryEntryPage />
              </Suspense>
            } />
            <Route path="/picker-demo" element={
              <Suspense fallback={<PageLoader />}>
                <PickerDemo />
              </Suspense>
            } />
            <Route path="/airport-services-demo" element={
              <Suspense fallback={<PageLoader />}>
                <AirportServicesDemo />
              </Suspense>
            } />
            <Route path="/simple-test" element={
              <Suspense fallback={<PageLoader />}>
                <SimpleTest />
              </Suspense>
            } />
            {/* DEV ONLY - Diagnostic i18n */}
            {import.meta.env.DEV && (
              <Route path="/__i18n_debug" element={
                <Suspense fallback={<PageLoader />}>
                  <I18nDebug />
                </Suspense>
              } />
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            </CategoryShowcaseProvider>
          </BrowserRouter>
        </TooltipProvider>
        </CartProvider>
        </WhatsAppContactProvider>
        </ExchangeRateProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
