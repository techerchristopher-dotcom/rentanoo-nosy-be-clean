import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navbar } from "@/components/layout/navbar";

// Routes critiques (chargées immédiatement)
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Callback from "./pages/auth/Callback";
import Profile from "./pages/Profile";
import ClientOnboarding from "./pages/onboarding/ClientOnboarding";
import ProfileTest from "./pages/ProfileTest";
import BookingDiscussion from "./pages/booking/BookingDiscussion";
import MessageToOwners from "./pages/booking/MessageToOwners";
import Legal from "./pages/legal/Legal";
import SinistreCaution from "./pages/sinistre-caution/SinistreCaution";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Routes non critiques (lazy-loaded)
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
const Admin = lazy(() => import("./pages/admin/Admin"));
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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* Wrapper to allow a fixed dev language switcher on all pages */}
            <div className="relative">
              {/* Dev-only floating language switcher, visible on all pages */}
              <div className="fixed bottom-4 right-4 z-50">
                <LanguageSwitcher />
              </div>
              {/* Navbar - Rendu directement pour éviter les problèmes de ErrorBoundary */}
              <Navbar />
              <Routes>
            {/* Routes critiques (chargées immédiatement) */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/onboarding/client" element={<ClientOnboarding />} />
            <Route path="/profile" element={
              <ErrorBoundary>
                <Profile />
              </ErrorBoundary>
            } />
            <Route path="/profile-test" element={<ProfileTest />} />
            <Route path="/vehicle/:license/booking/discussion" element={<BookingDiscussion />} />
            <Route path="/moto/:license/booking/discussion" element={<BookingDiscussion />} />
            <Route path="/booking/message" element={<MessageToOwners />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/sinistre-caution" element={<SinistreCaution />} />
            <Route path="/contact" element={<Contact />} />
            
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
            <Route path="/admin" element={
              <Suspense fallback={<PageLoader />}>
                <Admin />
              </Suspense>
            } />
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
