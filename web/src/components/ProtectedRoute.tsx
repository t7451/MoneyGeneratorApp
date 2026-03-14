import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * ProtectedRoute wrapper for authenticated routes
 * 
 * Usage:
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <DashboardPage />
 *   </ProtectedRoute>
 * } />
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="auth-loading">
        <Loader2 size={32} className="auth-loading-spinner" />
        <p>Loading...</p>
        <style>{`
          .auth-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
            color: var(--color-neutral-500);
          }
          .auth-loading-spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

/**
 * PublicOnlyRoute - redirects authenticated users away (e.g., from login page)
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({
  children,
  redirectTo = '/',
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading">
        <Loader2 size={32} className="auth-loading-spinner" />
        <p>Loading...</p>
        <style>{`
          .auth-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
            color: var(--color-neutral-500);
          }
          .auth-loading-spinner {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // Redirect authenticated users to home
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
