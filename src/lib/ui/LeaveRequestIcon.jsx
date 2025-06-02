import React from "react";

export default function LeaveRequestIcon({ size = 24, color = "#6B7280" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Calendar outline */}
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      {/* Top bars (the tabs on calendar) */}
      <line
        x1="8"
        y1="2"
        x2="8"
        y2="6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="2"
        x2="16"
        y2="6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* The "X" inside calendar */}
      <line
        x1="9.5"
        y1="11.5"
        x2="14.5"
        y2="16.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="14.5"
        y1="11.5"
        x2="9.5"
        y2="16.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
