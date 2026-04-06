import React, { useContext, useState, useCallback } from 'react';

export interface OnboardingCheckpoint {
  id: string;
  label: string;
  completed: boolean;
  importance: 'critical' | 'important' | 'optional';
  completedAt?: string;
}

export interface OnboardingUser {
  role: 'freelancer' | 'business' | 'individual' | null;
  checkpoints: OnboardingCheckpoint[];
  tutorialsWatched: string[];
  lastCheckpointTime?: string;
}

interface OnboardingContextType {
  user: OnboardingUser;
  setRole: (role: 'freelancer' | 'business' | 'individual') => void;
  updateCheckpoint: (id: string, completed: boolean) => void;
  markTutorialWatched: (tutorialId: string) => void;
  getCompletionPercentage: () => number;
  getAllCheckpoints: () => OnboardingCheckpoint[];
  getIncompleteCheckpoints: () => OnboardingCheckpoint[];
}

const OnboardingContext = React.createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const DEFAULT_CHECKPOINTS: Record<string, OnboardingCheckpoint[]> = {
  freelancer: [
    { id: 'welcome', label: 'Welcome & Setup', completed: false, importance: 'critical' },
    { id: 'connect_bank', label: 'Connect Your Bank', completed: false, importance: 'important' },
    { id: 'connect_platforms', label: 'Connect Gig Platforms', completed: false, importance: 'important' },
    { id: 'set_goals', label: 'Set Financial Goals', completed: false, importance: 'optional' },
    { id: 'enable_automations', label: 'Enable Automations', completed: false, importance: 'optional' },
    { id: 'explore_dashboard', label: 'Explore Dashboard', completed: false, importance: 'important' },
  ],
  business: [
    { id: 'welcome', label: 'Welcome & Setup', completed: false, importance: 'critical' },
    { id: 'connect_bank', label: 'Connect Business Bank Account', completed: false, importance: 'critical' },
    { id: 'add_team_members', label: 'Add Team Members', completed: false, importance: 'important' },
    { id: 'setup_bookkeeping', label: 'Setup Automated Bookkeeping', completed: false, importance: 'important' },
    { id: 'configure_payroll', label: 'Configure Payroll Settings', completed: false, importance: 'important' },
  ],
  individual: [
    { id: 'welcome', label: 'Welcome & Setup', completed: false, importance: 'critical' },
    { id: 'connect_bank', label: 'Connect Your Bank Account', completed: false, importance: 'important' },
    { id: 'manual_setup', label: 'Add Income & Expense Categories', completed: false, importance: 'important' },
    { id: 'set_savings_goals', label: 'Set Savings Goals', completed: false, importance: 'optional' },
    { id: 'explore_insights', label: 'Explore Financial Insights', completed: false, importance: 'optional' },
  ],
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<OnboardingUser>(() => {
    const stored = localStorage.getItem('onboarding_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // corrupt data, reset
      }
    }
    return {
      role: null,
      checkpoints: [],
      tutorialsWatched: [],
    };
  });

  const saveUser = useCallback((updatedUser: OnboardingUser) => {
    setUser(updatedUser);
    localStorage.setItem('onboarding_user', JSON.stringify(updatedUser));
  }, []);

  const setRole = useCallback((role: 'freelancer' | 'business' | 'individual') => {
    setUser((prev) => {
      const checkpoints = DEFAULT_CHECKPOINTS[role]?.map(c => ({ ...c })) || [];
      const updated: OnboardingUser = {
        ...prev,
        role,
        checkpoints,
      };
      saveUser(updated);
      return updated;
    });
  }, [saveUser]);

  const updateCheckpoint = useCallback((id: string, completed: boolean) => {
    setUser((prev) => {
      // If checkpoints are empty but we have a role, initialize them
      let checkpoints = prev.checkpoints;
      if (checkpoints.length === 0 && prev.role) {
        checkpoints = DEFAULT_CHECKPOINTS[prev.role]?.map(c => ({ ...c })) || [];
      }

      const updated = {
        ...prev,
        checkpoints: checkpoints.map(cp =>
          cp.id === id
            ? { ...cp, completed, completedAt: completed ? new Date().toISOString() : undefined }
            : cp
        ),
        lastCheckpointTime: new Date().toISOString(),
      };
      saveUser(updated);
      return updated;
    });
  }, [saveUser]);

  const markTutorialWatched = useCallback((tutorialId: string) => {
    setUser((prev) => {
      if (prev.tutorialsWatched.includes(tutorialId)) return prev;
      const updated = {
        ...prev,
        tutorialsWatched: [...prev.tutorialsWatched, tutorialId],
      };
      saveUser(updated);
      return updated;
    });
  }, [saveUser]);

  const getCompletionPercentage = useCallback(() => {
    if (user.checkpoints.length === 0) return 0;
    const completed = user.checkpoints.filter((cp) => cp.completed).length;
    return Math.round((completed / user.checkpoints.length) * 100);
  }, [user.checkpoints]);

  const getAllCheckpoints = useCallback(() => user.checkpoints, [user.checkpoints]);

  const getIncompleteCheckpoints = useCallback(
    () => user.checkpoints.filter((cp) => !cp.completed),
    [user.checkpoints]
  );

  return (
    <OnboardingContext.Provider
      value={{
        user,
        setRole,
        updateCheckpoint,
        markTutorialWatched,
        getCompletionPercentage,
        getAllCheckpoints,
        getIncompleteCheckpoints,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
