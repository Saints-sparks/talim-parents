import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import ProtectedRoute from './Pages/ProtectedRoute';  // Import your ProtectedRoute

function AppLayout() {
  // Layout with Sidebar + Navbar + content area that renders nested routes
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-6 flex-grow overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes with Layout */}
        <Route element={<ProtectedRoute />}>
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

        {/* Redirect unknown paths to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
