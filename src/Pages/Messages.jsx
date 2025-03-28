import MessagesSidebar from '../Components/MessagesSidebar';
import ChatDetailsModal from '../Components/ChatDetailsModal';
import React, { useState, useRef, useEffect } from 'react';
import { FaPhone, FaVideo, FaSearch, FaPaperclip, FaMicrophone, FaPaperPlane, FaArrowLeft,  FaStop,  FaEllipsisV, FaTrash, FaReply, FaDownload } from 'react-icons/fa';
import { IoIosArrowDown } from "react-icons/io";


function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
const [, setSelectedMessage] = useState(null);
const [replyingTo, setReplyingTo] = useState(null);
const [showDetailsModal, setShowDetailsModal] = useState(false);
const [openDropdownId, setOpenDropdownId] = useState(null);
const [filePreview, setFilePreview] = useState(null);
const [showFilePreview, setShowFilePreview] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);



// Function to toggle dropdown
const toggleDropdown = (messageId) => {
  setOpenDropdownId(openDropdownId === messageId ? null : messageId);
};

// Function to close dropdown when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (!event.target.closest(".message-options-dropdown")) {
      setOpenDropdownId(null);
    }
  };

  document.addEventListener("click", handleClickOutside);
  return () => {
    document.removeEventListener("click", handleClickOutside);
  };
}, []);


const handleDeleteMessage = (id) => {
  setMessages(messages.filter((msg) => msg.id !== id));
  setSelectedMessage(null);
};

const handleReplyMessage = (msg) => {
  setReplyingTo(msg);
  setSelectedMessage(null);
};

const handleForwardMessage = (msg) => {
  alert(`Forwarding message: ${msg.text}`);
  setSelectedMessage(null);
};

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];
  
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
  
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/mp3" });
        setAudioBlob(audioBlob);
      };
  
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const sendMessage = () => {
    if (isRecording) {
      handleStopRecording(); // Stop recording before sending
      return;
    }
  
    if (newMessage.trim() === '' && !audioBlob) return; // Prevent sending empty messages
  
    const newMsg = {
      id: messages.length + 1,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: audioBlob ? "file" : "text",
      text: audioBlob ? "" : newMessage.trim(),
      fileType: audioBlob ? "audio/mp3" : null,
      fileURL: audioBlob ? URL.createObjectURL(audioBlob) : null,
    };
  
    setMessages([...messages, newMsg]);
    setNewMessage('');
    setAudioBlob(null);
  
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Function to handle file selection and display in chat
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileURL = URL.createObjectURL(file);

      const fileMsg = {
        id: messages.length + 1,
        fileURL,
        fileType: file.type,
        fileName: file.name,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'file',
      };
      setSelectedFile(file);
      setFilePreview(fileURL);
      setShowFilePreview(true);
     
      setMessages([...messages, fileMsg]);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setShowSidebar(false);
  };
  
  
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
    {/* Sidebar */}
    <div className={`fixed inset-y-0 left-0 md:static bg-white w-screen md:w-[300px] lg:w-[350px] h-full z-50 transform transition-transform duration-300 ease-in-out ${
      showSidebar ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0 overflow-y-auto`}>
      <MessagesSidebar setSelectedChat={handleChatSelect} />
    </div>

      {/* Main Chat Section */}
      <div className="flex-1 flex flex-col w-full md:w-auto">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-3 md:p-4 flex items-center justify-between border-b shadow-sm">
              <div className="flex items-center space-x-3">
                <button 
                  className="md:hidden text-gray-600 hover:text-gray-900 mr-2 p-1"
                  onClick={() => setShowSidebar(true)}
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
                 <img
            src={selectedChat.profilePic}
            alt="Profile"
            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover cursor-pointer"
            onClick={() => setShowDetailsModal(true)}
          />
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold truncate pr-2">
                    {selectedChat.name}
                  </h3>
                  <p className="text-xs md:text-sm text-cyan-800">
                    {selectedChat.status === 'typing' ? 'typing...' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:space-x-4">
                <FaPhone className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
                <FaVideo className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
                <FaSearch className="text-gray-500 cursor-pointer hover:text-cyan-800/50 w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
 {/* Chat Details Modal */}
 {showDetailsModal && (
        <ChatDetailsModal chat={selectedChat} onClose={() => setShowDetailsModal(false)} />
      )}

   <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 bg-gray-50 relative">
   {messages.map((msg) => (
  <div 
    key={msg.id} 
    className={`relative p-2 md:p-3 max-w-[85%] md:max-w-[70%] rounded-lg ${
      msg.sender === "user" ? "bg-cyan-800/50 text-white ml-auto" : "bg-white text-black shadow-sm"
    }`}
  >
    {/* Reply Context */}
    {msg.replyTo && (
      <div className="text-xs text-gray-500 bg-gray-200 p-1 rounded mb-1">
        "{msg.replyTo.text}"
      </div>
    )}

    {/* Message Content */}
    {msg.type === "file" ? (
      <>
        {msg.fileType.startsWith("image/") ? (
          <img src={msg.fileURL} alt="Uploaded file" className="rounded-lg max-w-full h-auto" />
        ) : msg.fileType.startsWith("video/") ? (
          <video controls className="rounded-lg max-w-full">
            <source src={msg.fileURL} type={msg.fileType} />
            Your browser does not support the video tag.
          </video>
        ) : msg.fileType.startsWith("audio/") ? (
          <audio controls className="w-full">
            <source src={msg.fileURL} type={msg.fileType} />
            Your browser does not support the audio element.
          </audio>
        ) : (
          <a href={msg.fileURL} download={msg.fileName} className="text-blue-300 underline break-all hover:text-blue-200">
            📎 {msg.fileName}
          </a>
        )}
      </>
    ) : (
      <p className="break-words text-sm md:text-base">{msg.text}</p>
    )}
    <small className="text-xs opacity-70 block mt-1">{msg.timestamp}</small>

    {/* Dropdown Menu Button */}
    <button 
      onClick={(e) => {
        e.stopPropagation();
        toggleDropdown(msg.id);
      }} 
      className="absolute top-2 right-2 text-gray-500"
    >
      <IoIosArrowDown />
    </button>

    {/* Message Options Dropdown */}
    {openDropdownId === msg.id && (
      <div 
        className="absolute text-gray-600 bg-white shadow-md rounded-lg p-2 z-50 message-options-dropdown"
        style={{ right: 0, top: "100%", minWidth: "150px" }}
      >
        <button
          onClick={() => handleReplyMessage(msg)}
          className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full"
        >
          <FaReply className="text-gray-600" /> <span>Reply</span>
        </button>
        <button
          onClick={() => handleForwardMessage(msg)}
          className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full"
        >
          <FaPaperPlane className="text-gray-600" /> <span>Forward</span>
        </button>
        <button
          onClick={() => handleDeleteMessage(msg.id)}
          className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full text-red-500"
        >
          <FaTrash /> <span>Delete</span>
        </button>
        {msg.type === "file" && (
          <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 w-full">
            <FaDownload className="text-gray-600" /> <span>Download</span>
          </button>
        )}
      </div>
    )}
  </div>
))}
      {/* Reply Box (Shows only if replyingTo is set) */}
      {replyingTo && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-200 flex items-center">
          <span className="text-xs text-gray-600 mr-2">Replying to: "{replyingTo.text}"</span>
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 p-2 border rounded"
          />
          <button 
            className="ml-2 bg-cyan-800 text-white px-3 py-1 rounded"
            onClick={() => {
              setMessages([...messages, { id: Date.now(), sender: "user", text: newMessage, replyTo: replyingTo }]);
              setReplyingTo(null);
              setNewMessage("");
              sendMessage();
            }}
          >
            <FaPaperPlane className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
            {/* Message Input */}
            <div className="bg-white p-3 md:p-4 border-t">
              <div className="flex items-center space-x-2 md:space-x-3 max-w-[1200px] mx-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => fileInputRef.current.click()}
          >
            <FaPaperclip className="text-gray-500 w-5 h-5" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />

  <input 
      type="text" 
      placeholder="Type a message..." 
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      onKeyDown={handleKeyPress}
      className="flex-1 p-2 md:p-3 rounded-md text-sm md:text-base focus:ring-1 focus:ring-cyan-800 focus:border-transparent bg-gray-50"
    />
                <button 
                  onClick={sendMessage}
                  className="p-2 text-cyan-800/50 hover:bg-blue-50 rounded-full transition-colors"
                >
                  <FaPaperPlane className="w-5 h-5" />
                </button>
                <button 
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isRecording ? <FaStop className="text-red-500 w-5 h-5" /> : <FaMicrophone className="text-gray-500 w-5 h-5" />}
            </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-4">
              <p className="text-gray-400 text-sm md:text-base mb-2">
                Select a chat to start messaging
              </p>
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-blue-500 hover:text-blue-600 text-sm"
              >
                Open Chats
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;