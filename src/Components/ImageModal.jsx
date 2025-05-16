import React, { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaDownload } from 'react-icons/fa';

function ImageModal({ isOpen, imageUrl, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl || 'https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80'}
          alt="Zoomed content"
          className="max-w-full max-h-[90vh] object-contain"
        />
        
        <div className="absolute top-4 right-4 flex gap-2">
          <a
            href={imageUrl}
            download
            className="bg-white p-2 rounded-full hover:bg-gray-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <FaDownload className="text-black" />
          </a>
          <button
            onClick={onClose}
            className="bg-white p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <IoClose className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageModal;