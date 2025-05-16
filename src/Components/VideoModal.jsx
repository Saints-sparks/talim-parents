import React, { useRef, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

function VideoModal({ isOpen, videoUrl, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
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
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full max-h-[90vh]"
        >
          <source src={videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <IoClose className="text-black" />
        </button>
      </div>
    </div>
  );
}

export default VideoModal;