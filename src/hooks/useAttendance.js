import { useState, useEffect } from "react";
import { attendanceService } from "../services/attendance.service";  // Adjust path if necessary
import { toast } from "react-hot-toast";  // Optional for user notifications
import { useAuthContext } from "../contexts/AuthContext"; // Assuming this is where you get the access token

export function useAttendance(studentId) {
  const { accessToken, isAuthenticated } = useAuthContext();  // Get access token and auth status from context
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId || !isAuthenticated || !accessToken) {
      setAttendanceData(null);
      return;
    }

    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await attendanceService.getDashboard(studentId, accessToken);
        setAttendanceData(data);
      } catch (err) {
        const message = err.message || "Failed to load attendance data";
        setError(message);
        toast.error(message);  // Display error message to user
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId, accessToken, isAuthenticated]);

  return { attendanceData, loading, error };
}
