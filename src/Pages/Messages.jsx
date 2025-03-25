import MessagesSidebar from '../Components/MessagesSidebar';
import React, { useState, useRef } from 'react';
import { FaPhone, FaVideo, FaSearch, FaPaperclip, FaMicrophone, FaPaperPlane, FaArrowLeft,  FaStop } from 'react-icons/fa';

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
  const [selectedFile, setSelectedFile] = useState(null);
const [filePreview, setFilePreview] = useState(null);
const [fileCaption, setFileCaption] = useState("");
const [showFilePreview, setShowFilePreview] = useState(false);

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

  const handleCancelFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileCaption("");
    setShowFilePreview(false);
  };
  
  const sendFileMessage = () => {
    if (!selectedFile) return;
  
    const newMsg = {
      id: messages.length + 1,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "file",
      text: fileCaption.trim(),
      fileType: selectedFile.type,
      fileURL: filePreview,
      fileName: selectedFile.name,
    };
  
    setMessages([...messages, newMsg]);
    handleCancelFile(); // Clear preview after sending
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
  
  {showFilePreview && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">Preview File</h3>
  
        {selectedFile.type.startsWith("image/") && (
          <img src={filePreview} alt="Preview" className="w-full rounded-lg" />
        )}
        {selectedFile.type.startsWith("video/") && (
          <video controls className="w-full rounded-lg">
            <source src={filePreview} type={selectedFile.type} />
            Your browser does not support the video tag.
          </video>
        )}
        {selectedFile.type.startsWith("audio/") && (
          <audio controls className="w-full">
            <source src={filePreview} type={selectedFile.type} />
            Your browser does not support the audio element.
          </audio>
        )}
  
        <textarea
          placeholder="Add a caption..."
          value={fileCaption}
          onChange={(e) => setFileCaption(e.target.value)}
          className="w-full p-2 mt-2 border rounded-md focus:ring-1 focus:ring-cyan-800 focus:border-transparent"
        ></textarea>
  
        <div className="flex justify-end space-x-2 mt-3">
          <button onClick={handleCancelFile} className="text-gray-500 hover:text-red-600">
            Cancel
          </button>
          <button onClick={sendFileMessage} className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600">
            Send
          </button>
        </div>
      </div>
    </div>
  )}
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed md:static md:flex bg-white w-full md:w-[300px] lg:w-[350px] h-full z-50 transform transition-transform duration-300 ease-in-out ${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
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
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
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

            {/* Messages Section */}
            <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 bg-gray-50">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-2 md:p-3 max-w-[85%] md:max-w-[70%] rounded-lg ${
                      msg.sender === 'user' 
                        ? 'bg-cyan-800/50 text-white ml-auto' 
                        : 'bg-white text-black shadow-sm'
                    }`}
                  >
                {msg.type === 'file' ? (
  <>
    {msg.fileType.startsWith('image/') ? (
      <img src={msg.fileURL} alt="Uploaded file" className="rounded-lg max-w-full h-auto" />
    ) : msg.fileType.startsWith('video/') ? (
      <video controls className="rounded-lg max-w-full">
        <source src={msg.fileURL} type={msg.fileType} />
        Your browser does not support the video tag.
      </video>
    ) : msg.fileType.startsWith('audio/') ? (
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
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-sm md:text-base text-center">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
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
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
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