import React from 'react';

export default function MessagesIcon({ width = 24, height = 24, color = "#9CA3AF" }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="messages icon"
      role="img"
    >
      {/* Back bubble */}
      <path
        d="M18 14.5C19.3807 14.5 20.5 13.3807 20.5 12C20.5 10.6193 19.3807 9.5 18 9.5H7C5.61929 9.5 4.5 10.6193 4.5 12C4.5 13.3807 5.61929 14.5 7 14.5H8.5L7.25 15.75C7.067 15.933 7.017 16.224 7.136 16.47C7.255 16.716 7.512 16.875 7.79 16.875H8.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front bubble */}
      <path
        d="M14 10.5C15.3807 10.5 16.5 9.38071 16.5 8C16.5 6.61929 15.3807 5.5 14 5.5H6C4.61929 5.5 3.5 6.61929 3.5 8C3.5 9.38071 4.61929 10.5 6 10.5H7.5L6.25 11.75C6.067 11.933 6.017 12.224 6.136 12.47C6.255 12.716 6.512 12.875 6.79 12.875H7.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      <circle cx="9" cy="8" r="1" fill={color} />
      <circle cx="12" cy="8" r="1" fill={color} />
      <circle cx="15" cy="8" r="1" fill={color} />
    </svg>
  );
}
