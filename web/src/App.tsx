import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './utils/onboardingContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import './App.css';

const OnboardingWizard = lazy(async () => ({
  default: (await import('./components/OnboardingWizard')).OnboardingWizard,
}));
const Checkout = lazy(async () => ({
  default: (await import('./components/Checkout')).Checkout,
}));
const DashboardPageV2 = lazy(async () => ({
  default: (await import('./pages/DashboardPageV2')).DashboardPageV2,
}));
const ProductsPage = lazy(async () => ({
  default: (await import('./pages/ProductsPage')).ProductsPage,
}));
const JobsPage = lazy(async () => ({
  default: (await import('./pages/JobsPage')).JobsPage,
}));
const TeamPage = lazy(async () => ({
  default: (await import('./pages/TeamPage')).TeamPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('./pages/SettingsPage')).SettingsPage,
}));
const MileagePage = lazy(async () => ({
  default: (await import('./pages/MileagePage')).MileagePage,
}));
const TaxPage = lazy(async () => ({
  default: (await import('./pages/TaxPage')).TaxPage,
}));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ConnectDashboard = lazy(() => import('./pages/ConnectDashboard'));
const OpsPage = lazy(() => import('./pages/OpsPage'));
const Storefront = lazy(async () => ({
  default: (await import('./pages/Storefront')).Storefront,
}));
const StorefrontSuccess = lazy(async () => ({
  default: (await import('./pages/Storefront')).StorefrontSuccess,
}));

function RouteLoadingShell({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="app-route-loading" role="status" aria-live="polite">
      <div className="app-route-loading__spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const { 
    showOnboarding, 
    completeOnboarding, 
    updateRole,
    isCheckoutOpen, 
    closeCheckout, 
    upgradeSubscription, 
    userProfile,
    connectBank,
    connectPlatform,
    setGoal
  } = useAppContext();

  // Show onboarding for authenticated users who haven't completed it
  if (isAuthenticated && showOnboarding) {
    return (
      <Suspense fallback={<RouteLoadingShell message="Loading onboarding..." />}>
        <OnboardingWizard
          onComplete={completeOnboarding}
          onConnectBank={connectBank}
          onSelectRole={updateRole}
          onSelectPlan={(planId) => {
            upgradeSubscription(planId, []); 
          }}
          onConnectPlatform={connectPlatform}
          onSetGoal={setGoal}
        />
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={<RouteLoadingShell />}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          } />
          <Route path="/register" element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          } />
          
          {/* Public storefront routes - customers can view without login */}
          <Route path="/storefront/:accountId" element={<Storefront />} />
          <Route path="/storefront/:accountId/success" element={<StorefrontSuccess />} />
          
          {/* Protected app routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPageV2 />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="referrals" element={<ReferralPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="mileage" element={<MileagePage />} />
            <Route path="taxes" element={<TaxPage />} />
            <Route path="ops" element={<OpsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            
            {/* Stripe Connect routes */}
            <Route path="connect/dashboard" element={<ConnectDashboard />} />
            <Route path="connect/onboarding/return" element={<ConnectDashboard />} />
            <Route path="connect/onboarding/refresh" element={<ConnectDashboard />} />
          </Route>
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      
      {isCheckoutOpen && (
        <Suspense fallback={<RouteLoadingShell message="Loading checkout..." />}>
          <Checkout
            currentPlan={userProfile.subscription || undefined}
            onSelectPlan={(planId, cycle, addons, payment) =>
              upgradeSubscription(planId, addons, {
                billingCycle: cycle,
                paymentMethod: payment.method,
                savedMethodId: payment.savedMethodId,
                autoRetry: payment.autoRetry,
                rememberMethod: payment.rememberMethod,
              })
            }
            onClose={closeCheckout}
          />
        </Suspense>
      )}
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppProvider>
              <OnboardingProvider>
                <AppRoutes />
              </OnboardingProvider>
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
