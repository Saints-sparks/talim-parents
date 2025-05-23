import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useAuth } from '../services/auth.services'; // adjust import

export default function ProtectedRoute() {
  const { authToken, loading } = useAuth();

  if (loading) {
    // Skeleton placeholder for loading state
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton height={40} count={5} style={{ marginBottom: '1rem' }} />
      </div>
    );
  }

  if (!authToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
