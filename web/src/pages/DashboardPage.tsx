import React from 'react';
import { Dashboard } from '../components/Dashboard';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { GuidedTour, useTourNavigation, useOnboarding } from '../utils/onboardingSystem';

export const DashboardPage: React.FC = () => {
  const { userProfile, connectBank, openCheckout } = useAppContext();
  const { showToast } = useToast();
  const { markTutorialWatched, user } = useOnboarding();

  const dashboardTourSteps = [
    {
      id: 'dashboard-welcome',
      title: 'Welcome to Your Dashboard',
      description: 'Monitor all your financial metrics, earnings, and insights in one place.',
      highlightSelector: '.dashboard-content',
      position: 'bottom' as const,
    },
    {
      id: 'dashboard-earnings',
      title: 'Your Earnings Overview',
      description: 'Quickly see your total earnings and weekly changes at a glance.',
      highlightSelector: '.earnings-card',
      position: 'bottom' as const,
    },
    {
      id: 'dashboard-bank',
      title: 'Bank Connection',
      description: 'Connect your bank account to automatically track all your finances.',
      highlightSelector: '.bank-section',
      position: 'bottom' as const,
    },
    {
      id: 'dashboard-insights',
      title: 'Financial Insights',
      description: 'Get AI-powered insights about your spending and earning patterns.',
      highlightSelector: '.insights-section',
      position: 'top' as const,
    },
  ];

  const tour = useTourNavigation(dashboardTourSteps, () => {
    markTutorialWatched('dashboard-tour');
    showToast('Dashboard tour complete! 🎉', 'success');
  });

  const shouldShowTour = user.role && !user.tutorialsWatched.includes('dashboard-tour');

  return (
    <>
      {tour.isActive && (
        <GuidedTour
          steps={dashboardTourSteps}
          isActive={tour.isActive}
          currentStepIndex={tour.currentStepIndex}
          onStepChange={tour.goToStep}
          onComplete={tour.skipTour}
          onSkip={tour.skipTour}
          showSkip
        />
      )}
      <Dashboard
        earnings={userProfile.earnings}
        weeklyChange={userProfile.weeklyChange}
        bankConnected={userProfile.bankConnected}
        hasSubscription={!!userProfile.subscription}
        onConnectBank={connectBank}
        onUpgrade={openCheckout}
        onViewAnalytics={() => showToast('Analytics coming soon!', 'info')}
      />
      {shouldShowTour && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 40 }}>
          <button
            onClick={tour.startTour}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            🎯 Start Tour
          </button>
        </div>
      )}
    </>
  );
};
