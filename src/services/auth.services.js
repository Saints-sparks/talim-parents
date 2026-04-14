import { useState } from 'react';
import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5005';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [authToken, setAuthToken] = useState(localStorage.getItem('access_token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
    const [schoolId, setSchoolId] = useState(localStorage.getItem('school_id'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (email, password) => {
        setLoading(true);
        setError(null); // Clear previous errors

        try {
            console.log('Attempting login with:', { email, API_BASE_URL });

            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email,
                password,
            }, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Login response:', response.data);

            const { access_token, refresh_token } = response.data;

            if (!access_token) {
                throw new Error('Invalid response: missing access token');
            }

            // Store tokens
            localStorage.setItem('access_token', access_token);
            setAuthToken(access_token);

            if (refresh_token) {
                localStorage.setItem('refresh_token', refresh_token);
                setRefreshToken(refresh_token);
            } else {
                // No refresh token returned by the backend; proceed without it
                console.warn('No refresh token returned by login response; continuing without refresh token.');
                setRefreshToken(null);
            }

            // Introspect to get user info
            console.log('Getting user info...');
            const introspectRes = await axios.post(`${API_BASE_URL}/auth/introspect`, {
                token: access_token,
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Introspect response:', introspectRes.data);

            const userData = introspectRes.data?.user;

            if (!userData) {
                throw new Error('Invalid response: missing user data');
            }

            // RBAC: only parent role is permitted in this portal
            if (userData.role !== 'parent') {
                // Clear stored tokens — this login is not allowed
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                const friendlyRole = userData.role.replace(/_/g, ' ');
                const rbacMsg =
                    `Access denied. This portal is for parents only. ` +
                    `Your account is registered as "${friendlyRole}". ` +
                    `Please use the correct Talim app for your role.`;
                setError(rbacMsg);
                setLoading(false);
                // Return the specific error type so the UI can show the right banner
                return { kind: 'access_denied', message: rbacMsg };
            }

            setUser(userData);
            setSchoolId(userData?.schoolId);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('school_id', userData?.schoolId || '');
            localStorage.setItem('parent_id', userData?.userId || '');

            setLoading(false);
            return { kind: 'success' };

        } catch (err) {
            console.error('Login error:', err);

            let errorMessage = 'Incorrect email or password. Please check your credentials and try again.';

            if (err.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to the server. Please check your internet connection and try again.';
            } else if (err.code === 'ENOTFOUND') {
                errorMessage = 'Server not found. Please check your internet connection and try again.';
            } else if (err.response) {
                const serverMsg = err.response.data?.message;
                if (err.response.status === 401) {
                    errorMessage = 'Incorrect email or password. Please double-check your credentials and try again.';
                } else if (serverMsg) {
                    errorMessage = serverMsg;
                } else {
                    errorMessage = `Server error (${err.response.status}). Please try again later.`;
                }
            } else if (err.request) {
                errorMessage = 'No response from server. Please check your internet connection.';
            } else if (err.message) {
                // Includes RBAC errors thrown above
                errorMessage = err.message;
            }

            const isCredentialError =
                err.response?.status === 401 ||
                errorMessage.toLowerCase().includes('incorrect') ||
                errorMessage.toLowerCase().includes('credentials');
            setError(errorMessage);
            setLoading(false);
            return {
                kind: isCredentialError ? 'invalid_credentials' : 'unknown',
                message: errorMessage,
            };
        }
    };

    const register = async (email, password, role, schoolId, firstName, lastName, phoneNumber) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                email,
                password,
                role,
                schoolId,
                firstName,
                lastName,
                phoneNumber,
            });
            setLoading(false);
            return response.data;
        } catch (err) {
            setError('Registration failed, please check the information');
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await axios.post(
                `${API_BASE_URL}/auth/logout`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            localStorage.clear();

            setAuthToken(null);
            setRefreshToken(null);
            setSchoolId(null);
            setUser(null);
            setLoading(false);
        } catch (err) {
            setError('Logout failed');
            setLoading(false);
        }
    };

    const refreshTokenHandler = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
                refreshToken,
            });
            const { access_token, refresh_token } = response.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            setAuthToken(access_token);
            setRefreshToken(refresh_token);
        } catch (err) {
            setError('Token refresh failed');
        }
    };

    const getProfile = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/profile/${user?.userId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            setUser(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to load profile');
            setLoading(false);
        }
    };

    const updateProfile = async (updatedData) => {
        setLoading(true);
        try {
            const response = await axios.put(
                `${API_BASE_URL}/profile/update/`,
                updatedData,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );
            setUser(response.data);
            setLoading(false);
        } catch (err) {
            setError('Profile update failed');
            setLoading(false);
        }
    };

    const forgotPassword = async (email) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Attempting forgot password with:', { email, API_BASE_URL });

            const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
                email,
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Forgot password response:', response.data);
            setLoading(false);
            return response.data;

        } catch (err) {
            console.error('Forgot password error:', err);

            let errorMessage = 'Failed to send reset code. Please try again.';

            if (err.response) {
                errorMessage = err.response.data?.message || errorMessage;
            }

            setError(errorMessage);
            setLoading(false);
            throw new Error(errorMessage);
        }
    };

    const resetPassword = async (email, token, newPassword) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Attempting password reset with:', { email, token, API_BASE_URL });

            const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
                email,
                token,
                newPassword,
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Password reset response:', response.data);
            setLoading(false);
            return response.data;

        } catch (err) {
            console.error('Password reset error:', err);

            let errorMessage = 'Failed to reset password. Please try again.';

            if (err.response) {
                errorMessage = err.response.data?.message || errorMessage;
            }

            setError(errorMessage);
            setLoading(false);
            throw new Error(errorMessage);
        }
    };

    return {
        user,
        schoolId,
        authToken,
        refreshToken,
        loading,
        error,
        login,
        register,
        logout,
        refreshTokenHandler,
        getProfile,
        updateProfile,
        forgotPassword,
        resetPassword,
    };
};
