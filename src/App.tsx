import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Components/Navbar';
import Sidebar from './Components/Sidebar';
import Login from './Login';
import Dashboard from './Pages/Dashboard';
import RequestLeave from './Pages/RequestLeave';
import Result from './Pages/Result';
import Attendance from './Pages/Attendance';
import Timetable from './Pages/Timetable';
import MyChildren from './Pages/MyChildren';
import Messages from './Pages/Messages';
import LeaveForm from './Components/LeaveForm';
import Notifications from './Pages/Notifications';
import NotificationDetail from './Pages/NotificationDetail';
import Profile from './Pages/Profile';
import Settings from './Pages/Settings';
import ProtectedRoute from './Pages/ProtectedRoute';
import Payments from './Pages/Payments';
import MakePayment from './Pages/MakePayment';
import Onboarding from './Pages/Onboarding';
import { AuthProvider } from './services/auth.services';
import { SelectedStudentProvider } from './contexts/SelectedStudentContext';
import { ParentOnboardingProvider, useParentOnboarding } from './contexts/ParentOnboardingContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ChatAlertsProvider } from './contexts/ChatAlertsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import ParentGuideTour from './Components/onboarding/ParentGuideTour';
import { ToastViewport } from './Components/CustomToast';
import { useNotificationRealtime } from './hooks/useNotificationRealtime';

/** Visiting one of these routes counts as completing that onboarding step. */
const ONBOARDING_ROUTE_STEPS: Record<string, string> = {
  '/my-children': 'select-ward',
  '/notifications': 'view-notifications',
  '/attendance': 'view-attendance',
  '/timetable': 'view-timetable',
  '/result': 'view-results',
  '/requestleave': 'request-leave',
  '/leaveform': 'request-leave',
  '/messages': 'open-messages',
};

/** Marks onboarding steps complete as the parent visits the pages they name. */
function OnboardingRouteTracker() {
  const location = useLocation();
  const { markStepComplete } = useParentOnboarding();

  useEffect(() => {
    const stepId = ONBOARDING_ROUTE_STEPS[location.pathname];
    if (stepId) markStepComplete(stepId);
  }, [location.pathname, markStepComplete]);

  return null;
}

/** Keeps the notification lists live from socket events, once, for the whole signed-in shell. */
function LiveNotifications() {
  useNotificationRealtime();
  return null;
}

/** The signed-in shell: sidebar, top bar and the routed page. */
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8] font-manrope dark:bg-[#0f1629]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <div className="flex-grow overflow-auto p-6">
          <Outlet />
        </div>
      </div>
      <ParentGuideTour />
      <LiveNotifications />
    </div>
  );
}

/**
 * The application root.
 *
 * Provider order matters: `QueryProvider` sits inside `AuthProvider` so the
 * cache is created once the session exists, and outside everything that reads
 * data, so every page shares one cache.
 *
 * @returns The application tree.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          <SelectedStudentProvider>
            <ParentOnboardingProvider>
              <WebSocketProvider>
                <Router>
                  <ChatAlertsProvider>
                    <OnboardingRouteTracker />
                    <ToastViewport />
                    <Routes>
                      <Route path="/" element={<Login />} />

                      <Route element={<ProtectedRoute />}>
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route element={<AppLayout />}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/requestleave" element={<RequestLeave />} />
                          <Route path="/my-children" element={<MyChildren />} />
                          <Route path="/timetable" element={<Timetable />} />
                          <Route path="/attendance" element={<Attendance />} />
                          <Route path="/result" element={<Result />} />
                          <Route path="/messages" element={<Messages />} />
                          <Route path="/leaveform" element={<LeaveForm />} />
                          <Route path="/notifications" element={<Notifications />} />
                          <Route path="/notifications/:id" element={<NotificationDetail />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/payments" element={<Payments />} />
                          <Route path="/payments/pay" element={<MakePayment />} />
                          <Route path="/payments/verify" element={<MakePayment />} />
                          <Route path="/settings" element={<Settings />} />
                        </Route>
                      </Route>

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ChatAlertsProvider>
                </Router>
              </WebSocketProvider>
            </ParentOnboardingProvider>
          </SelectedStudentProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
