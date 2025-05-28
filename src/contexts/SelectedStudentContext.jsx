import { createContext, useContext, useState, useEffect } from "react";

const SelectedStudentContext = createContext();

export const SelectedStudentProvider = ({ children }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Load previously selected student from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("selected_student");
    if (stored) {
      setSelectedStudent(JSON.parse(stored));
    }
  }, []);

  const updateSelectedStudent = (student) => {
    localStorage.setItem("selected_student", JSON.stringify(student));
    setSelectedStudent(student);
  };

  return (
    <SelectedStudentContext.Provider
      value={{ selectedStudent, updateSelectedStudent }}
    >
      {children}
    </SelectedStudentContext.Provider>
  );
};

export const useSelectedStudent = () => useContext(SelectedStudentContext);
