// Components/SpinnerLoader.jsx
import React from 'react';

const SpinnerLoader = ({ size = 40, color = '#3498db' }) => {
  return (
    <div className="flex justify-center items-center py-6">
      <div
        style={{
          width: size,
          height: size,
          border: `4px solid #f3f3f3`,
          borderTop: `4px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SpinnerLoader;
