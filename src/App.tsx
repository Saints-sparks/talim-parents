import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import SignIn from './Pages/auth/SignIn';
import ForgotPassword from './Pages/auth/ForgotPassword';
import SetPassword from './Pages/auth/SetPassword';
import Dashboard from './Pages/Dashboard';
import Attendance from './Pages/Attendance';
import Timetable from './Pages/Timetable';
import Results from './Pages/Results';
import Leave from './Pages/Leave';
import Messages from './Pages/Messages';
import Notifications from './Pages/Notifications';
import Payments from './Pages/Payments';
import MakePayment from './Pages/MakePayment';
import Settings from './Pages/Settings';
import ProtectedRoute from './Pages/ProtectedRoute';
import Onboarding from './Pages/Onboarding';
import { AuthProvider } from './services/auth.services';
import { SelectedStudentProvider } from './contexts/SelectedStudentContext';
import { ParentOnboardingProvider, useParentOnboarding } from './contexts/ParentOnboardingContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ChatAlertsProvider } from './contexts/ChatAlertsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import { TourProvider } from './Components/portal/tour/TourProvider';
import { PortalLayout } from './Components/portal/shell/PortalLayout';
import { ToastViewport } from './Components/CustomToast';
import { useNotificationRealtime } from './hooks/useNotificationRealtime';

/** Visiting one of these routes counts as completing that onboarding step. */
const ONBOARDING_ROUTE_STEPS: Record<string, string> = {
  '/notifications': 'view-notifications',
  '/attendance': 'view-attendance',
  '/timetable': 'view-timetable',
  '/results': 'view-results',
  '/leave': 'request-leave',
  '/messages': 'open-messages',
};

/**
 * Marks onboarding steps complete as the parent visits the pages they name.
 *
 * @returns Nothing visible.
 */
function OnboardingRouteTracker() {
  const location = useLocation();
  const { markStepComplete } = useParentOnboarding();

  useEffect(() => {
    const stepId = ONBOARDING_ROUTE_STEPS[location.pathname];
    if (stepId) markStepComplete(stepId);
  }, [location.pathname, markStepComplete]);

  return null;
}

/**
 * Keeps the notification lists live from socket events, once, for the whole signed-in shell.
 *
 * @returns Nothing visible.
 */
function LiveNotifications() {
  useNotificationRealtime();
  return null;
}

/**
 * The signed-in shell with the live notification listener.
 *
 * @returns The layout.
 */
function SignedInShell() {
  return (
    <>
      <PortalLayout />
      <LiveNotifications />
    </>
  );
}

/**
 * Sends an old notification link (`/notifications/:id`) to the list with that item open.
 *
 * @returns The redirect.
 */
function NotificationRedirect() {
  const { id } = useParams();
  return <Navigate to={`/notifications?id=${encodeURIComponent(id ?? '')}`} replace />;
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
                    <TourProvider>
                      <OnboardingRouteTracker />
                      <ToastViewport />
                      <Routes>
                        <Route path="/" element={<SignIn />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/set-password" element={<SetPassword />} />

                        <Route element={<ProtectedRoute />}>
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route element={<SignedInShell />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/attendance" element={<Attendance />} />
                            <Route path="/timetable" element={<Timetable />} />
                            <Route path="/results" element={<Results />} />
                            <Route path="/leave" element={<Leave />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/payments/pay" element={<MakePayment />} />
                            <Route path="/payments/verify" element={<MakePayment />} />
                            <Route path="/settings" element={<Settings />} />
                          </Route>
                        </Route>

                        {/* Old addresses, kept so bookmarks, pushes and emails still land. */}
                        <Route path="/result" element={<Navigate to="/results" replace />} />
                        <Route path="/requestleave" element={<Navigate to="/leave" replace />} />
                        <Route path="/leaveform" element={<Navigate to="/leave" replace />} />
                        <Route path="/my-children" element={<Navigate to="/settings?tab=children" replace />} />
                        <Route path="/profile" element={<Navigate to="/settings?tab=account" replace />} />
                        <Route path="/notifications/:id" element={<NotificationRedirect />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </TourProvider>
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
