import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useAuth } from '../services/auth.services';
import { useParentOnboarding } from '../contexts/ParentOnboardingContext';

export default function ProtectedRoute() {
  const location = useLocation();
  const { authToken, loading } = useAuth();
  const {
    isHydrated,
    hasNoLinkedWards,
    isStepComplete,
  } = useParentOnboarding();
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isChildrenRoute = location.pathname === '/my-children';

  if (loading || !isHydrated) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton height={40} count={5} style={{ marginBottom: '1rem' }} />
      </div>
    );
  }

  if (!authToken) {
    return <Navigate to="/" replace />;
  }

  const requiredEntryComplete =
    isStepComplete('parent-profile') && isStepComplete('select-ward');

  if (!isOnboardingRoute && !isChildrenRoute && (!requiredEntryComplete || hasNoLinkedWards)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
