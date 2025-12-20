import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Callback from "./pages/auth/Callback";
import Profile from "./pages/Profile";
import ProfileTest from "./pages/ProfileTest";
import { ErrorBoundary } from "./components/ErrorBoundary";
import VehicleDetails from "./pages/vehicles/VehicleDetails";
import BookingDiscussion from "./pages/booking/BookingDiscussion";
import MessageToOwners from "./pages/booking/MessageToOwners";
import RenterBookings from "./pages/renter/RenterBookings";
import PaymentSuccess from "./pages/renter/PaymentSuccess";
import PaymentCancel from "./pages/renter/PaymentCancel";
import OwnerVehicles from "./pages/owner/OwnerVehicles";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerBookingRequests from "./pages/owner/OwnerBookingRequests";
import OwnerBookingDiscussion from "./pages/owner/OwnerBookingDiscussion";
import ManageVehicle from "./pages/owner/ManageVehicle";
import AddVehicle from "./pages/owner/AddVehicle";
import AddMotoPlaceholder from "./pages/owner/AddMotoPlaceholder";
import Dashboard from "./pages/owner/Dashboard";
import RentMyCarLanding from "./pages/owner/RentMyCarLanding";
import RentMyCarRegister from "./pages/owner/RentMyCarRegister";
import Admin from "./pages/admin/Admin";
import Legal from "./pages/legal/Legal";
import { PickerDemo } from "./pages/PickerDemo";
import AirportServicesDemo from "./pages/AirportServicesDemo";
import SimpleTest from "./pages/SimpleTest";
import DictionaryIndex from "./pages/dictionary/DictionaryIndex";
import DictionaryEntryPage from "./pages/dictionary/DictionaryEntry";
import NotFound from "./pages/NotFound";
import Checking from "./pages/Checking";
import CheckinReturnPage from "./pages/checkin-return/[bookingId]";
import MotoVehicleDetails from "./pages/vehicles/MotoVehicleDetails";
// DEV ONLY - Diagnostic i18n
import I18nDebug from "./pages/__I18nDebug";

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
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/callback" element={<Callback />} />
            <Route path="/profile" element={
              <ErrorBoundary>
                <Profile />
              </ErrorBoundary>
            } />
            <Route path="/profile-test" element={<ProfileTest />} />
            <Route path="/vehicle/:license" element={<VehicleDetails />} />
            <Route path="/vehicle/:license/booking/discussion" element={<BookingDiscussion />} />
            <Route path="/moto/:license" element={<MotoVehicleDetails />} />
            <Route path="/moto/:license/booking/discussion" element={<BookingDiscussion />} />
            <Route path="/booking/message" element={<MessageToOwners />} />
            <Route path="/me/dashboard" element={<Dashboard />} />
            <Route path="/me/renter/bookings" element={<RenterBookings />} />
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/cancel" element={<PaymentCancel />} />
            <Route path="/me/owner/vehicles" element={<OwnerVehicles />} />
            <Route path="/me/owner/bookings" element={<OwnerBookings />} />
            <Route path="/me/owner/requests" element={<OwnerBookingRequests />} />
            <Route path="/me/owner/requests/:conversationId/discussion" element={<OwnerBookingDiscussion />} />
            <Route path="/me/owner/vehicles/add" element={<AddVehicle />} />
            <Route path="/me/owner/vehicles/add-moto" element={<AddMotoPlaceholder />} />
            <Route path="/me/owner/vehicles/:vehicleId/manage" element={<ManageVehicle />} />
            <Route path="/rent-my-car" element={<RentMyCarLanding />} />
            <Route path="/rent-my-car/register" element={<RentMyCarRegister />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/picker-demo" element={<PickerDemo />} />
            <Route path="/airport-services-demo" element={<AirportServicesDemo />} />
            <Route path="/simple-test" element={<SimpleTest />} />
            <Route path="/dictionary" element={<DictionaryIndex />} />
            <Route path="/dictionary/:id" element={<DictionaryEntryPage />} />
            <Route path="/checking/:bookingId" element={<Checking />} />
            <Route path="/checkin-return/:bookingId" element={<CheckinReturnPage />} />
            {/* DEV ONLY - Diagnostic i18n */}
            {import.meta.env.DEV && (
              <Route path="/__i18n_debug" element={<I18nDebug />} />
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
