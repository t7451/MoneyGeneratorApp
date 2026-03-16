import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './utils/onboardingContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import type { BillingCycle, PaymentDetails } from './components/Checkout';
import './App.css';

function lazyNamed(importer: () => Promise<Record<string, ComponentType<any>>>, exportName: string) {
  return lazy(async () => ({
    default: (await importer())[exportName] as ComponentType<any>,
  }));
}

function lazyDefault(importer: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(importer);
}

const OnboardingWizard = lazyNamed(() => import('./components/OnboardingWizard'), 'OnboardingWizard');
const Checkout = lazyNamed(() => import('./components/Checkout'), 'Checkout');
const DashboardPageV2 = lazyNamed(() => import('./pages/DashboardPageV2'), 'DashboardPageV2');
const ProductsPage = lazyNamed(() => import('./pages/ProductsPage'), 'ProductsPage');
const JobsPage = lazyNamed(() => import('./pages/JobsPage'), 'JobsPage');
const TeamPage = lazyNamed(() => import('./pages/TeamPage'), 'TeamPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage'), 'SettingsPage');
const MileagePage = lazyNamed(() => import('./pages/MileagePage'), 'MileagePage');
const TaxPage = lazyNamed(() => import('./pages/TaxPage'), 'TaxPage');
const Storefront = lazyNamed(() => import('./pages/Storefront'), 'Storefront');
const StorefrontSuccess = lazyNamed(() => import('./pages/Storefront'), 'StorefrontSuccess');
const ReferralPage = lazyDefault(() => import('./pages/ReferralPage'));
const PricingPage = lazyDefault(() => import('./pages/PricingPage'));
const ReportsPage = lazyDefault(() => import('./pages/ReportsPage'));
const NotificationsPage = lazyDefault(() => import('./pages/NotificationsPage'));
const LoginPage = lazyDefault(() => import('./pages/LoginPage'));
const RegisterPage = lazyDefault(() => import('./pages/RegisterPage'));
const ConnectDashboard = lazyDefault(() => import('./pages/ConnectDashboard'));
const OpsPage = lazyDefault(() => import('./pages/OpsPage'));

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
          onSelectPlan={(planId: string) => {
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
            onSelectPlan={(planId: string, cycle: BillingCycle, addons: string[], payment: PaymentDetails) =>
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
