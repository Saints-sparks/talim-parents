/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../services/auth.services";

const SelectedStudentContext = createContext();

export const SelectedStudentProvider = ({ children }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { parentId } = useAuth();

  useEffect(() => {
    if (!parentId) {
      setSelectedStudent(null);
      return;
    }

    const stored = localStorage.getItem(`selected_student_${parentId}`);
    if (stored) {
      try {
        setSelectedStudent(JSON.parse(stored));
      } catch {
        setSelectedStudent(null);
      }
    } else {
      setSelectedStudent(null);
    }
  }, [parentId]);

  const updateSelectedStudent = useCallback((student) => {
    if (!parentId || !student) return;
    localStorage.setItem(`selected_student_${parentId}`, JSON.stringify(student));
    setSelectedStudent(student);
  }, [parentId]);

  return (
    <SelectedStudentContext.Provider
      value={{ selectedStudent, updateSelectedStudent }}
    >
      {children}
    </SelectedStudentContext.Provider>
  );
};

export const useSelectedStudent = () => useContext(SelectedStudentContext);
