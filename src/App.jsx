// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
  <div className="App">
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/*" element={
        <div className="flex min-h-screen bg-[#f8f8f8]">
          <Sidebar />
          <div className="flex-1 flex flex-col"> {/* Added flex-col here */}
            <Navbar />
            <div className="p-6">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/requestleave" element={<RequestLeave />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/result" element={<Result />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/leaveform" element={<LeaveForm />} />
                <Route path="/notifications" element={<Notifications />} />

              </Routes>
            </div>
          </div>
        </div>
      } />
    </Routes>
  </div>
</Router>
  );
}

export default App;