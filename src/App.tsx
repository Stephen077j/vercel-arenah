import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ClientAuthProvider } from '@/client/lib/clientAuth';

// Front Office (client self-service)
import ClientLayout from '@/client/ClientLayout';
import ClientLogin from '@/client/pages/ClientLogin';
import ClientHome from '@/client/pages/ClientHome';
import ClientBoutique from '@/client/pages/ClientBoutique';
import ClientRestaurant from '@/client/pages/ClientRestaurant';
import ClientHotel from '@/client/pages/ClientHotel';
import ClientCart from '@/client/pages/ClientCart';
import ClientOrders from '@/client/pages/ClientOrders';
import ClientFavoris from '@/client/pages/ClientFavoris';
import ClientGym from '@/client/pages/ClientGym';
import ClientPool from '@/client/pages/ClientPool';
import ClientSalon from '@/client/pages/ClientSalon';
import ClientField from '@/client/pages/ClientField';
import ClientEvent from '@/client/pages/ClientEvent';
import ClientCybercafe from '@/client/pages/ClientCybercafe';
import ClientSpectacles from '@/client/pages/ClientSpectacles';
import ClientProfile from '@/client/pages/ClientProfile';
import ClientNotifications from '@/client/pages/ClientNotifications';
import ClientPayments from '@/client/pages/ClientPayments';
import ClientPaymentReceipt from '@/client/pages/ClientPaymentReceipt';
import ClientProductDetail from '@/client/pages/ClientProductDetail';
import ClientEnfants from '@/client/pages/ClientEnfants';
import NotFound from '@/client/pages/NotFound';

// Admin Module Portal
import AdminLayout from '@/admin/AdminLayout';
import AdminDashboard from '@/admin/pages/AdminDashboard';
import AdminOrders from '@/admin/pages/AdminOrders';
import AdminPayments from '@/admin/pages/AdminPayments';
import AdminProducts from '@/admin/pages/AdminProducts';
import AdminBookings from '@/admin/pages/AdminBookings';
import AdminClients from '@/admin/pages/AdminClients';
import AdminPromos    from '@/admin/pages/AdminPromos';
import AdminAnalytics from '@/admin/pages/AdminAnalytics';
import AdminAI from '@/admin/pages/AdminAI';
import AdminRestaurantConfig from '@/admin/pages/AdminRestaurantConfig';
import AdminCybercafeConfig from '@/admin/pages/AdminCybercafeConfig';
import AdminShowConfig from '@/admin/pages/AdminShowConfig';
import AdminSalonConfig from '@/admin/pages/AdminSalonConfig';
import AdminHotelConfig from '@/admin/pages/AdminHotelConfig';
import AdminGymConfig from '@/admin/pages/AdminGymConfig';
import AdminPoolConfig from '@/admin/pages/AdminPoolConfig';
import AdminFieldConfig from '@/admin/pages/AdminFieldConfig';
import AdminEventConfig from '@/admin/pages/AdminEventConfig';
import AdminBoutiqueConfig from '@/admin/pages/AdminBoutiqueConfig';
import AdminKidsConfig from '@/admin/pages/AdminKidsConfig';

// Super Admin Portal
import SuperAdminLayout from '@/superadmin/SuperAdminLayout';
import SuperAdminDashboard from '@/pages/super-admin/Dashboard';
import SuperAdminUsers from '@/superadmin/pages/SuperAdminUsers';
import SuperAdminHistory from '@/superadmin/pages/SuperAdminHistory';
import SuperAdminPlatformSettings from '@/superadmin/pages/SuperAdminPlatformSettings';
import SuperAdminAuditLogs from '@/superadmin/pages/SuperAdminAuditLogs';
import SuperAdminAnalytics from '@/superadmin/pages/SuperAdminAnalytics';
import Unauthorized from '@/pages/Unauthorized';
import CookieBanner from '@/components/CookieBanner';
import { LangProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import WhatsAppButton from '@/components/WhatsAppButton';
import BackToTop from '@/components/BackToTop';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import ClientCGV from '@/client/pages/ClientCGV';
import ClientPrivacy from '@/client/pages/ClientPrivacy';
import ClientFAQ from '@/client/pages/ClientFAQ';
import ClientAbout from '@/client/pages/ClientAbout';
import ClientReferral from '@/client/pages/ClientReferral';
import ProprietaireDashboard from '@/client/pages/ProprietaireDashboard';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LangProvider>
    <ClientAuthProvider>
        <Toaster />
        <CookieBanner />
        <WhatsAppButton />
        <BackToTop />
        <PWAInstallBanner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Page de connexion dédiée */}
            <Route path="/login" element={<ClientLogin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Front Office — client self-service */}
            <Route element={<ClientLayout />}>
              <Route path="/" element={<ClientHome />} />
              <Route path="/boutique" element={<ClientBoutique />} />
              <Route path="/boutique/:id" element={<ClientProductDetail />} />
              <Route path="/restaurant" element={<ClientRestaurant />} />
              <Route path="/hotel" element={<ClientHotel />} />
              <Route path="/salle-de-sport" element={<ClientGym />} />
              <Route path="/piscine" element={<ClientPool />} />
              <Route path="/salon" element={<ClientSalon />} />
              <Route path="/terrain-foot" element={<ClientField />} />
              <Route path="/evenementiel" element={<ClientEvent />} />
              <Route path="/cybercafe" element={<ClientCybercafe />} />
              <Route path="/spectacles" element={<ClientSpectacles />} />
              <Route path="/espace-enfants" element={<ClientEnfants />} />
              <Route path="/panier" element={<ClientCart />} />
              <Route path="/mes-commandes" element={<ClientOrders />} />
              <Route path="/favoris" element={<ClientFavoris />} />
              <Route path="/profil" element={<ClientProfile />} />
              <Route path="/notifications" element={<ClientNotifications />} />
              <Route path="/mes-paiements" element={<ClientPayments />} />
              <Route path="/mes-paiements/:id/facture" element={<ClientPaymentReceipt />} />
              <Route path="/cgv" element={<ClientCGV />} />
              <Route path="/confidentialite" element={<ClientPrivacy />} />
              <Route path="/faq" element={<ClientFAQ />} />
              <Route path="/a-propos" element={<ClientAbout />} />
              <Route path="/parrainage" element={<ClientReferral />} />
            </Route>

            {/* Propriétaire — hors ClientLayout, page autonome */}
            <Route path="/proprietaire" element={<ProprietaireDashboard />} />

            {/* Admin Module Portal */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="commandes"    element={<AdminOrders />} />
              <Route path="paiements"    element={<AdminPayments />} />
              <Route path="produits"     element={<AdminProducts />} />
              <Route path="reservations" element={<AdminBookings />} />
              <Route path="clients"      element={<AdminClients />} />
              <Route path="promos"       element={<AdminPromos />} />
              <Route path="analytics"    element={<AdminAnalytics />} />
              <Route path="ia"           element={<AdminAI />} />
              <Route path="config/tables"        element={<AdminRestaurantConfig />} />
              <Route path="config/stations"     element={<AdminCybercafeConfig />} />
              <Route path="config/sieges"       element={<AdminShowConfig />} />
              <Route path="config/combos"       element={<AdminSalonConfig />} />
              <Route path="config/hotel-rooms"  element={<AdminHotelConfig />} />
              <Route path="config/gym-plans"    element={<AdminGymConfig />} />
              <Route path="config/pool-passes"  element={<AdminPoolConfig />} />
              <Route path="config/field-slots"  element={<AdminFieldConfig />} />
              <Route path="config/event-halls"  element={<AdminEventConfig />} />
              <Route path="config/boutique"     element={<AdminBoutiqueConfig />} />
              <Route path="config/kids-tickets" element={<AdminKidsConfig />} />
            </Route>

            {/* Super Admin Portal — login redirige vers /login commun */}
            <Route path="/super-admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/super-admin" element={<SuperAdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"         element={<SuperAdminDashboard />} />
              <Route path="users"             element={<SuperAdminUsers />} />
              <Route path="history"           element={<SuperAdminHistory />} />
              <Route path="analytics"         element={<SuperAdminAnalytics />} />
              <Route path="audit-logs"        element={<SuperAdminAuditLogs />} />
              <Route path="platform-settings" element={<SuperAdminPlatformSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </ClientAuthProvider>
    </LangProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
