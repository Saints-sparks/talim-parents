import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // optional, for toasts
import nookies from 'nookies'; // for cookie management
import { authService } from './services/auth.services'; // your API service
import logo from './assets/logo.svg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [platform, setPlatform] = useState('web');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('deviceToken');
    if (token) {
      setDeviceToken(token);
    } else {
      const generatedToken = Math.random().toString(36).substr(2);
      localStorage.setItem('deviceToken', generatedToken);
      setDeviceToken(generatedToken);
    }
  }, []);

  // Implement login logic
  const login = async ({ email, password, deviceToken, platform }) => {
    try {
      const credentials = { email, password, deviceToken, platform };
      
      // Call the login API
      const loginResponse = await authService.login(credentials);

      // Introspect to get full user data
      const introspectResponse = await authService.introspect(loginResponse.access_token);

      const userData = {
        id: introspectResponse.user.userId,
        email: introspectResponse.user.email,
        firstName: introspectResponse.user.firstName,
        lastName: introspectResponse.user.lastName,
        phoneNumber: introspectResponse.user.phoneNumber,
        role: introspectResponse.user.role,
        isActive: introspectResponse.user.isActive,
        isEmailVerified: introspectResponse.user.isEmailVerified,
      };

      // Set tokens in cookies/localStorage
      nookies.set(null, 'access_token', loginResponse.access_token, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true, userData };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (email && password) {
      setLoading(true);
      setErrorMessage('');
      
      const { success, message } = await login({ email, password, deviceToken, platform });

      if (success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        setErrorMessage(message || 'Login failed, please check your credentials');
      }
      
      setLoading(false);
    } else {
      setErrorMessage('Please enter both email and password.');
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <div className="flex-1 flex flex-col items-center justify-start pt-10 gap-y-[40px]">
        <img src={logo} alt="Logo" className="mb-6 mt-5" />

        <form onSubmit={handleLogin} className="flex flex-col items-center justify-center w-full max-w-xs px-4 md:px-0">
          <h1 className="font-normal text-xl">Welcome back</h1>
          <p className="text-center mb-6">Sign in to continue your learning journey.</p>

          <div className="w-full mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div className="w-full mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            />
            <div className="flex gap-x-2 mt-3 mb-7">
              <input type="checkbox" />
              <p>Keep me signed in</p>
            </div>
          </div>

          {errorMessage && (
            <div className="w-full mb-4 text-red-500 text-sm">{errorMessage}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 ${loading ? 'bg-gray-400' : 'bg-blue-900'} text-white rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      <div className="hidden md:block bg-[#f8f8f8f] flex-1 bg-[url('public/par.svg')] bg-cover bg-center h-screen"></div>
    </div>
  );
}

export default Login;
