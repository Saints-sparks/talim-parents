// VideoOverlay.tsx (Updated)
import React from 'react';
import { X } from 'lucide-react';

function VideoOverlay({ videoURL, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg relative">
        <video controls src={videoURL} className="w-full h-[480px] rounded-t-lg" />
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-white bg-black/70 rounded-full p-2 hover:bg-black"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 flex justify-between items-center border-t">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Download Video
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Send to...
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoOverlay;