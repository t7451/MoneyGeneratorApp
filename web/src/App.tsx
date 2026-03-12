import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './utils/onboardingSystem';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Checkout } from './components/Checkout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { JobsPage } from './pages/JobsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import './design-system.css';
import './App.css';

const AppRoutes = () => {
  const { 
    showOnboarding, 
    completeOnboarding, 
    updateRole,
    isCheckoutOpen, 
    closeCheckout, 
    upgradeSubscription, 
    userProfile,
    connectBank
  } = useAppContext();

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={completeOnboarding}
        onConnectBank={connectBank}
        onSelectRole={updateRole}
        onSelectPlan={(planId) => {
          upgradeSubscription(planId, []); 
        }}
      />
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
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
          <AppProvider>
            <OnboardingProvider>
              <AppRoutes />
            </OnboardingProvider>
          </AppProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
