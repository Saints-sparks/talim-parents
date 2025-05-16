import MessagesSidebar from '../Components/MessagesSidebar';
import ChatDetailsModal from '../Components/ChatDetailsModal';
import React, { useState, useRef, useEffect } from 'react';
import ChatHeader from '../Components/ChatHeader';
import MessageList from '../Components/MessageList';
import MessageInput from '../Components/MessageInput';
import FilePreview from '../Components/FilePreview';

function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileCaption, setFileCaption] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({
    images: [],
    videos: [],
    documents: [],
  });
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Simulate messages for testing
  useEffect(() => {
    const dummyMessages = [
      {
        id: 1,
        sender: "user",
        text: "Hi everyone! Don't forget, the creative writing assignment is due tomorrow.",
        timestamp: "3:10 PM",
        type: "text",
      },
      {
        id: 2,
        sender: "teacher",
        text: "Good evening, students. Please make sure to inform your parents about the Everyday English textbook.",
        timestamp: "3:15 PM",
        type: "text",
      },
      {
        id: 3,
        sender: "user",
        fileURL: "https://via.placeholder.com/150", // Image URL
        timestamp: "3:20 PM",
        type: "file",
        fileType: "image",
      },
      {
        id: 4,
        sender: "teacher",
        fileURL: "https://via.placeholder.com/150", // Video URL
        timestamp: "3:25 PM",
        type: "file",
        fileType: "video",
      },
    ];
    setMessages(dummyMessages);
  }, []);

  const sendMessage = (withFile = false) => {
    if (!withFile && newMessage.trim() === '' && !audioBlob) return;

    let newMsg = {
      id: messages.length + 1,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    if (withFile && selectedFile) {
      newMsg = {
        ...newMsg,
        type: 'file',
        fileURL: filePreview,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        text: fileCaption,
      };
    } else if (audioBlob) {
      newMsg = {
        ...newMsg,
        type: 'file',
        fileType: 'audio/mp3',
        fileURL: URL.createObjectURL(audioBlob),
      };
    } else {
      newMsg = {
        ...newMsg,
        type: 'text',
        text: newMessage.trim(),
      };
    }

    setMessages([...messages, newMsg]);
    setNewMessage('');
    setAudioBlob(null);
    setSelectedFile(null);
    setFilePreview(null);
    setFileCaption('');

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setShowSidebar(false);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    const fileURL = URL.createObjectURL(file);

    console.log("File selected: ", file.name, type);

    setUploadedFiles((prev) => ({
      ...prev,
      [type]: [...prev[type], { fileURL, name: file.name, type: file.type }],
    }));

    setFilePreview(fileURL);
    setSelectedFile(file);
    setShowModal(false); // Close modal after selecting file
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className={`fixed inset-y-0 left-0 md:static bg-white w-screen md:w-[300px] lg:w-[350px] h-full z-50 transform transition-transform duration-300 ease-in-out ${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 overflow-y-auto`}>
        <MessagesSidebar setSelectedChat={handleChatSelect} />
      </div>

      <div className="flex-1 flex flex-col w-full md:w-auto">
        {selectedChat ? (
          <>
            <ChatHeader 
              selectedChat={selectedChat}
              setShowSidebar={setShowSidebar}
            />

            <MessageList
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={sendMessage}
              filePreview={filePreview}
              setFilePreview={setFilePreview}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              fileCaption={fileCaption}
              setFileCaption={setFileCaption}
              messagesEndRef={messagesEndRef}
            />

            <MessageInput
              fileInputRef={fileInputRef}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={() => sendMessage(false)}
              handleOpenModal={handleOpenModal}
            />
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-96">
            <h3 className="text-lg font-semibold mb-4">{modalType}</h3>
            <input
              type="file"
              accept={modalType === "Images" ? "image/*" : modalType === "Videos" ? "video/*" : "application/pdf"}
              onChange={(e) => handleFileChange(e, modalType.toLowerCase())}
              ref={fileInputRef}
            />
            <div className="mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="bg-red-500 text-white py-1 px-4 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
