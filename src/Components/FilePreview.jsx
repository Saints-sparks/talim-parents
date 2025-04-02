import React from 'react';
import { X } from 'lucide-react';

function FilePreview({ 
  file, 
  filePreview, 
  caption, 
  setCaption, 
  onSend, 
  onCancel 
}) {
  const getFilePreview = () => {
    if (file.type.startsWith('image/')) {
      return <img src={filePreview} alt="Preview" className="max-h-[200px] rounded-lg object-contain" />;
    } else if (file.type.startsWith('video/')) {
      return (
        <video className="max-h-[200px] rounded-lg" controls>
          <source src={filePreview} type={file.type} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (file.type.startsWith('audio/')) {
      return (
        <audio className="w-full" controls>
          <source src={filePreview} type={file.type} />
          Your browser does not support the audio element.
        </audio>
      );
    } else {
      return (
        <div className="flex items-center space-x-2 p-4 bg-gray-100 rounded-lg">
          <div className="text-4xl">📎</div>
          <div className="flex-1 truncate">{file.name}</div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          {getFilePreview()}
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;