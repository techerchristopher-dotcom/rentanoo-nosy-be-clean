import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { sendPageView } from "@/lib/gtag";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navbar } from "@/components/layout/navbar";
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
const MessageToOwners = lazy(() => import("./pages/booking/MessageToOwners"));
const Legal = lazy(() => import("./pages/legal/Legal"));
const SinistreCaution = lazy(() => import("./pages/sinistre-caution/SinistreCaution"));
const Contact = lazy(() => import("./pages/Contact"));

// Autres routes lourdes (déjà lazy)
const VehicleDetails = lazy(() => import("./pages/vehicles/VehicleDetails"));
const MotoVehicleDetails = lazy(() => import("./pages/vehicles/MotoVehicleDetails"));
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
const AdminPlaceholderUsers = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderUsers }))
);
const AdminPlaceholderVehicles = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderVehicles }))
);
const AdminPlaceholderPayments = lazy(() =>
  import("./pages/admin/AdminPlaceholders").then((m) => ({ default: m.AdminPlaceholderPayments }))
);
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

/** Envoie un page_view GA4 à chaque changement de route (SPA). La 1re page est déjà envoyée par gtag('config'). */
function RouteChangeTracker() {
  const location = useLocation();
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    sendPageView(location.pathname + location.search, document.title);
  }, [location.pathname, location.search]);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteChangeTracker />
            <ClientProfileCompletionGuard />
            {/* Wrapper to allow a fixed dev language switcher on all pages */}
            <div className="relative">
              {/* Dev-only floating language switcher, visible on all pages */}
              <div className="fixed bottom-4 right-4 z-50">
                <LanguageSwitcher />
              </div>
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
            <Route path="/booking/message" element={<Suspense fallback={<PageLoader />}><MessageToOwners /></Suspense>} />
            <Route path="/legal" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
            <Route path="/sinistre-caution" element={<Suspense fallback={<PageLoader />}><SinistreCaution /></Suspense>} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
