import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Components/Navbar';
import Sidebar from './Components/Sidebar';
import Login from './Login';
import Dashboard from './Pages/Dashboard';
import RequestLeave from './Pages/RequestLeave';
import Result from './Pages/Result';
import Attendance from './Pages/Attendance';
import Timetable from './Pages/Timetable';
import Messages from './Pages/Messages';
import LeaveForm from './Components/LeaveForm';
import Notifications from './Pages/Notifications';
import NotificationDetail from './Pages/NotificationDetail';
import ProtectedRoute from './Pages/ProtectedRoute';
import Onboarding from './Pages/Onboarding';
import { AuthProvider } from './services/auth.services';
import { SelectedStudentProvider } from './contexts/SelectedStudentContext';
import { ParentOnboardingProvider, useParentOnboarding } from './contexts/ParentOnboardingContext';
import ParentGuideTour from './Components/onboarding/ParentGuideTour';

const ONBOARDING_ROUTE_STEPS = {
  '/notifications': 'view-notifications',
  '/attendance': 'view-attendance',
  '/timetable': 'view-timetable',
  '/result': 'view-results',
  '/requestleave': 'request-leave',
  '/leaveform': 'request-leave',
  '/messages': 'open-messages',
};

function OnboardingRouteTracker() {
  const location = useLocation();
  const { markStepComplete } = useParentOnboarding();

  React.useEffect(() => {
    const stepId = ONBOARDING_ROUTE_STEPS[location.pathname];
    if (stepId) markStepComplete(stepId);
  }, [location.pathname, markStepComplete]);

  return null;
}

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8] font-manrope">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-6 flex-grow overflow-auto">
          <Outlet />
        </div>
      </div>
      <ParentGuideTour />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SelectedStudentProvider>
        <ParentOnboardingProvider>
          <Router>
            <OnboardingRouteTracker />
            <Routes>
              <Route path="/" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/requestleave" element={<RequestLeave />} />
                  <Route path="/timetable" element={<Timetable />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/result" element={<Result />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/leaveform" element={<LeaveForm />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/notifications/:id" element={<NotificationDetail />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ParentOnboardingProvider>
      </SelectedStudentProvider>
    </AuthProvider>
  );
}

export default App;
