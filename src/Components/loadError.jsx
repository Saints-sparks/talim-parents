import React from "react";

const shakeAnimation = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
`;

// A bold error icon: red circle with white X
const ErrorIcon = () => (
  <svg
    className="w-16 h-16 text-red-600 animate-pulse"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <line
      x1="15"
      y1="9"
      x2="9"
      y2="15"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <line
      x1="9"
      y1="9"
      x2="15"
      y2="15"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export default function LoadError({ message, onRetry }) {
  return (
    <>
      <style>{shakeAnimation}</style>
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
        <div
          className="flex flex-col items-center p-6 border border-red-400 rounded-lg bg-red-50 shadow-md"
          style={{ animation: "shake 0.5s ease-in-out 3" }}
        >
          <ErrorIcon />
          <h2 className="mt-4 text-2xl font-semibold text-red-700">Failed to Load</h2>
          <p className="mt-2 text-center text-red-600 max-w-sm">{message}</p>
          <button
            onClick={onRetry}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    </>
  );
}
