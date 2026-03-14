import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './utils/onboardingSystem';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Checkout } from './components/Checkout';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { JobsPage } from './pages/JobsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { MileagePage } from './pages/MileagePage';
import { TaxPage } from './pages/TaxPage';
import ReferralPage from './pages/ReferralPage';
import PricingPage from './pages/PricingPage';
import ReportsPage from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ConnectDashboard } from './pages/ConnectDashboard';
import { Storefront, StorefrontSuccess } from './pages/Storefront';
import './index.css';
import './App.css';

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
    );
  }

  return (
    <>
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
        {/* NOTE: In production, use a merchant slug instead of accountId */}
        <Route path="/storefront/:accountId" element={<Storefront />} />
        <Route path="/storefront/:accountId/success" element={<StorefrontSuccess />} />
        
        {/* Protected app routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="referrals" element={<ReferralPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="mileage" element={<MileagePage />} />
          <Route path="taxes" element={<TaxPage />} />
          
          {/* Stripe Connect routes */}
          <Route path="connect/dashboard" element={<ConnectDashboard />} />
          <Route path="connect/onboarding/return" element={<ConnectDashboard />} />
          <Route path="connect/onboarding/refresh" element={<ConnectDashboard />} />
        </Route>
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {isCheckoutOpen && (
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
