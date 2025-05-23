// src/Components/Modal.js
import React from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FiX size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;