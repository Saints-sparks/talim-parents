// services/useSchool.js
import { useState, useEffect } from "react";
import { fetchSchoolById } from "../services/school.services";
import { useAuth } from "../services/auth.services"; // adjust path

export const useSchool = () => {
  const { schoolId, authToken } = useAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schoolId || !authToken) return;

    setLoading(true);
    setError(null);

    fetchSchoolById(schoolId, authToken)
      .then((data) => setSchool(data))
      .catch((err) => setError(err.message || "Failed to load school"))
      .finally(() => setLoading(false));
  }, [schoolId, authToken]);

  return { school, loading, error };
};
