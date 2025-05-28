import { useState, useEffect } from 'react';
import * as termService from '../services/term.services';

export const useTerm = () => {
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentTermId, setCurrentTermId] = useState(null)
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrentTerm = async () => {
    setLoading(true);
    try {
      const data = await termService.getCurrentTerm();
      console.log("Current term:", data);
      setCurrentTerm(data);
      setCurrentTermId(data?._id || null);  // Store ID separately
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch current term");
    } finally {
      setLoading(false);
    }
  };
  

  const fetchTermsBySchool = async () => {
    setLoading(true);
    try {
      const data = await termService.getTermsBySchool();
      setTerms(data.terms || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTerm();
    // You can call fetchTermsBySchool() here too if needed
  }, []);

  return {
    currentTerm,
    terms,
    loading,
    error,
    fetchCurrentTerm,
    currentTermId,
    fetchTermsBySchool,
  };
};
