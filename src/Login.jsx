import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from './assets/logo.svg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // Add your login logic here (e.g., API call for authentication)
    if (email && password) {
      // Navigate to the dashboard after successful login
      navigate('/dashboard'); 
    } else {
      alert("Please enter both email and password.");
    }
  };

  return (
    <div className='flex h-screen flex-col md:flex-row'>
      {/* Left Side - Form (full width on mobile, half width on desktop) */}
      <div className='flex-1 flex flex-col items-center justify-start pt-10 gap-y-[40px]'>
        <img src={logo} alt="Logo" className="mb-6 mt-5" />
        
        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className='flex flex-col items-center justify-center w-full max-w-xs px-4 md:px-0'>
          <h1 className='font-normal text-xl'>Welcome back</h1>
          <p className='text-center mb-6'>Sign in to continue your learning journey.</p>

          {/* Email Field */}
          <div className="w-full mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>

          {/* Password Field */}
          <div className="w-full mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            />
            
            {/* Check Box */}
            <div className='flex gap-x-2 mt-3 mb-7'>
              <input type="checkbox" />
              <p>Keep me signed in</p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-900 text-white rounded-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Login
          </button>
        </form>
      </div>

      {/* Right Side - Background Image (hidden on mobile, visible on desktop) */}
      <div className="hidden md:block bg-[#f8f8f8f] flex-1 bg-[url('public/par.svg')] bg-cover bg-center h-screen"></div>
    </div>
  );
}

export default Login;