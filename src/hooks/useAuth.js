"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import nookies from "nookies";
import { authService } from "../services/auth.services";
import { useAuthContext } from "../contexts/AuthContext";

export const useAuth = () => {
  const router = useRouter();
  const { setAuthState } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      // Step 1: Perform login and introspect
      const loginResponse = await authService.login(credentials);
      const introspectResponse = await authService.introspect(loginResponse.access_token);

      // Step 2: Create the userData object
      const userData = {
        id: introspectResponse.user.userId,
        email: introspectResponse.user.email,
        firstName: introspectResponse.user.firstName,
        lastName: introspectResponse.user.lastName,
        phoneNumber: introspectResponse.user.phoneNumber,
        role: introspectResponse.user.role,
        isActive: introspectResponse.user.isActive,
        isEmailVerified: introspectResponse.user.isEmailVerified,
        schoolId: introspectResponse.user.schoolId, // ✅ Must exist
      };

      // Log to confirm
      console.log("✅ [LOGIN] userData.schoolId:", userData.schoolId);

      // Step 3: Set the access_token in cookies
      nookies.set(null, "access_token", loginResponse.access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        secure: process.env.NODE_ENV === "production", // Ensures it's secure in production
        sameSite: "strict", // Restrict cookie for cross-site requests
      });

      // Step 4: Store user data and access_token in localStorage
      localStorage.setItem("user", JSON.stringify(userData)); // Store the user object
      localStorage.setItem("access_token", loginResponse.access_token); // Store the access token

      // Step 5: Update the global state using the context
      setAuthState(userData, loginResponse.access_token);

      // Notify the user and navigate to dashboard
      toast.success("Login successful!");
      router.push("/dashboard");

      return userData;
    } catch (error) {
      // If there’s any error, show a toast with the error message
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      // Stop the loading state
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
  };
};
