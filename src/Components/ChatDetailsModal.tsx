import React, { useState } from "react";
import { FaTimes, FaPhone, FaVideo, FaComment } from "react-icons/fa";

interface ChatDetailsModalProps {
  chat: any; // Replace 'any' with the appropriate chat type
  onClose: () => void;
}

const ChatDetailsModal: React.FC<ChatDetailsModalProps> = ({ chat, onClose }) => {
  const [selectedTab, setSelectedTab] = useState("description"); // Default to "description"

  // Sample Data (Replace with actual data from chat history)
  const classmates = chat.isGroup ? chat.members || [] : [];
  const images = chat.media?.filter((item: any) => item.type === "image") || [];
  const videos = chat.media?.filter((item: any) => item.type === "video") || [];
  const links = chat.media?.filter((item: any) => item.type === "link") || [];
  const documents = chat.media?.filter((item: any) => item.type === "document") || [];

  // Function to Render Selected Tab Content
  const renderContent = () => {
    switch (selectedTab) {
      case "classmates":
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">Classmates</h3>
            <ul>
              {classmates.length > 0 ? (
                classmates.map((member: any, index: number) => (
                  <li key={index} className="p-2 border-b">
                    {member.name}
                  </li>
                ))
              ) : (
                <p>No classmates found.</p>
              )}
            </ul>
          </div>
        );
      case "images":
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">Images</h3>
            <div className="grid grid-cols-3 gap-2">
              {images.length > 0 ? (
                images.map((img: any, index: number) => (
                  <img key={index} src={img.url} alt="Chat Image" className="w-full h-24 object-cover rounded" />
                ))
              ) : (
                <p>No images found.</p>
              )}
            </div>
          </div>
        );
      case "videos":
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">Videos</h3>
            {videos.length > 0 ? (
              videos.map((video: any, index: number) => (
                <video key={index} controls className="w-full h-40">
                  <source src={video.url} type="video/mp4" />
                </video>
              ))
            ) : (
              <p>No videos found.</p>
            )}
          </div>
        );
      case "links":
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">Links</h3>
            <ul>
              {links.length > 0 ? (
                links.map((link: any, index: number) => (
                  <li key={index} className="p-2 border-b">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                      {link.url}
                    </a>
                  </li>
                ))
              ) : (
                <p>No links found.</p>
              )}
            </ul>
          </div>
        );
      case "documents":
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">Documents</h3>
            <ul>
              {documents.length > 0 ? (
                documents.map((doc: any, index: number) => (
                  <li key={index} className="p-2 border-b">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                      {doc.name}
                    </a>
                  </li>
                ))
              ) : (
                <p>No documents found.</p>
              )}
            </ul>
          </div>
        );
      default:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-3">{chat.name}</h3>
            <p>{chat.description || "No description available."}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl h-[80vh] rounded-lg shadow-lg flex">
        {/* Left Sidebar */}
        <div className="w-1/3 bg-gray-100 p-4 border-r">
          <h3 className="text-lg font-semibold mb-3">Chat Details</h3>
          <ul className="space-y-3">
            {chat.isGroup && (
              <li
                className={`cursor-pointer p-2 rounded ${selectedTab === "classmates" ? "bg-gray-300" : "hover:bg-gray-200"}`}
                onClick={() => setSelectedTab("classmates")}
              >
                Classmates
              </li>
            )}
            <li
              className={`cursor-pointer p-2 rounded ${selectedTab === "images" ? "bg-gray-300" : "hover:bg-gray-200"}`}
              onClick={() => setSelectedTab("images")}
            >
              Images
            </li>
            <li
              className={`cursor-pointer p-2 rounded ${selectedTab === "videos" ? "bg-gray-300" : "hover:bg-gray-200"}`}
              onClick={() => setSelectedTab("videos")}
            >
              Videos
            </li>
            <li
              className={`cursor-pointer p-2 rounded ${selectedTab === "links" ? "bg-gray-300" : "hover:bg-gray-200"}`}
              onClick={() => setSelectedTab("links")}
            >
              Links
            </li>
            <li
              className={`cursor-pointer p-2 rounded ${selectedTab === "documents" ? "bg-gray-300" : "hover:bg-gray-200"}`}
              onClick={() => setSelectedTab("documents")}
            >
              Documents
            </li>
          </ul>
        </div>

        {/* Right Section */}
        <div className="w-2/3 p-6 relative">
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
            <FaTimes className="w-5 h-5" />
          </button>

          {/* Chat Profile & Info */}
          <div className="text-center">
            <img
              src={chat.profilePic}
              alt="Chat Profile"
              className="w-20 h-20 rounded-full mx-auto object-cover"
            />
            <h2 className="text-xl font-semibold mt-2">{chat.name}</h2>
          </div>

          {/* Call, Video, Message Icons */}
          <div className="flex justify-center space-x-6 mt-4">
            <button className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition">
              <FaPhone className="w-6 h-6 text-gray-600" />
            </button>
            <button className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition">
              <FaVideo className="w-6 h-6 text-gray-600" />
            </button>
            <button className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition">
              <FaComment className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content Based on Selected Tab */}
          <div className="mt-6 text-gray-600">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailsModal;
