import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Checkout } from './components/Checkout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { JobsPage } from './pages/JobsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
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
          onSelectPlan={(planId, _cycle, addons) => upgradeSubscription(planId, addons)}
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
            <AppRoutes />
          </AppProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
