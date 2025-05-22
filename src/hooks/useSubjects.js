// hooks/useSubjects.js
import { useState, useEffect } from "react";
import { subjectService } from "../services/subjects.services"; // Your API service
import { useAuthContext } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";

export function useSubjects() {
  const { accessToken, isAuthenticated } = useAuthContext();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSubjects() {
      if (!isAuthenticated || !accessToken) {
        setSubjects([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await subjectService.getSubjectsBySchool(accessToken);
        setSubjects(data);
      } catch (err) {
        const message = err.message || "Failed to fetch subjects";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [accessToken, isAuthenticated]);

  return {
    totalSubjects: subjects.length,
    loading,
    error,
  };
}
