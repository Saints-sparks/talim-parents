'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { destroyCookie, parseCookies } from "nookies";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  checkAuth: async () => false,
  logout: () => {},
  setAuthState: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const setAuthState = (newUser, newToken) => {
    if (newUser) {
      console.log("✅ [AuthContext] schoolId:", newUser.schoolId);
      setUser({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified,
        schoolId: newUser.schoolId,
      });
    } else {
      setUser(null);
    }

    setAccessToken(newToken);
    setIsAuthenticated(!!newUser && !!newToken);
  };

  const checkAuth = async () => {
    try {
      const cookies = parseCookies();
      const token = cookies.access_token;
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          console.log("📦 [checkAuth] Loaded from localStorage:", userData);
          setAuthState(userData, token);
          return true;
        } catch (error) {
          console.error("Failed to parse user data:", error);
          localStorage.removeItem("user");
        }
      }

      setAuthState(null, null);
      return false;
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState(null, null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    destroyCookie(null, "access_token");
    destroyCookie(null, "refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("studentDetails");
    setAuthState(null, null);
    navigate("/");
  };

  useEffect(() => {
    checkAuth();

    const handleStorageChange = (e) => {
      if (e.key === "user") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        accessToken,
        checkAuth,
        logout,
        setAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
