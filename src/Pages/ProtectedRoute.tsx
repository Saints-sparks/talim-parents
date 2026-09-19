import { Navigate, Outlet, useLocation } from 'react-router-dom';
import SkeletonLoader from '../Components/SkeletonLoader';
import { useAuth } from '../services/auth.services';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';
import { decideProtectedRoute } from './protectedRouteRules';

/**
 * Guards every signed-in page: waits for the session, sends visitors without
 * one to sign-in, and holds parents who have not finished the first two
 * onboarding steps on `/onboarding`.
 *
 * @returns A placeholder, a redirect, or the nested route.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const { authToken, loading } = useAuth();
  const { isHydrated, hasNoLinkedWards, isStepComplete } = useParentOnboarding();

  const decision = decideProtectedRoute({
    pathname: location.pathname,
    authToken,
    loading,
    isHydrated,
    hasNoLinkedWards,
    profileConfirmed: isStepComplete('parent-profile'),
    wardSelected: isStepComplete('select-ward'),
  });

  if (decision === 'loading') {
    return (
      <div className="min-h-screen space-y-4 bg-white p-8 dark:bg-[#0f1629]" role="status" aria-label="Loading">
        <SkeletonLoader type="custom" height="2.5rem" count={5} />
      </div>
    );
  }

  if (decision === 'login') return <Navigate to="/" replace />;
  if (decision === 'onboarding') return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
