import MessagesSidebar from '../Components/MessagesSidebar';
import ChatDetailsModal from '../Components/ChatDetailsModal';
import React, { useState, useRef, useEffect } from 'react';
import ChatHeader from '../Components/ChatHeader';
import MessageList from '../Components/MessageList';
import MessageInput from '../Components/MessageInput';
import FilePreview from '../Components/FilePreview';

function Messages() {
  const [selectedChat, setSelectedChat] = useState({
  });
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

  // Comprehensive dummy data for chat histories
  useEffect(() => {
    const dummyMessages = [
      // Text messages
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
        sender: "classmate1",
        text: "Has anyone started the math homework yet? I'm stuck on question 5.",
        timestamp: "3:20 PM",
        type: "text",
      },
      {
        id: 4,
        sender: "classmate2",
        text: "I can help with question 5! It's about quadratic equations. Let me send you my solution.",
        timestamp: "3:25 PM",
        type: "text",
      },
      // Image messages
      {
        id: 5,
        sender: "classmate2",
        fileURL: "https://via.placeholder.com/300x200?text=Math+Solution",
        timestamp: "3:30 PM",
        type: "file",
        fileType: "image",
        caption: "Here's my solution to question 5"
      },
      {
        id: 6,
        sender: "teacher",
        fileURL: "https://via.placeholder.com/400x300?text=Class+Schedule",
        timestamp: "3:35 PM",
        type: "file",
        fileType: "image",
        caption: "Updated class schedule for next week"
      },
      // Video messages
      {
        id: 7,
        sender: "classmate3",
        fileURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        timestamp: "3:40 PM",
        type: "file",
        fileType: "video",
        caption: "Check out this cool science experiment video!"
      },
      {
        id: 8,
        sender: "teacher",
        fileURL: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        timestamp: "3:45 PM",
        type: "file",
        fileType: "video",
        caption: "This will help with your physics project"
      },
      // Audio messages
      {
        id: 9,
        sender: "classmate1",
        fileURL: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        timestamp: "3:50 PM",
        type: "file",
        fileType: "audio",
        caption: "My explanation for question 5"
      },
      {
        id: 10,
        sender: "teacher",
        fileURL: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        timestamp: "3:55 PM",
        type: "file",
        fileType: "audio",
        caption: "Important announcement about tomorrow's class"
      },
      // Document messages
      {
        id: 11,
        sender: "teacher",
        fileURL: "https://www.africau.edu/images/default/sample.pdf",
        timestamp: "4:00 PM",
        type: "file",
        fileType: "document",
        caption: "Study guide for the upcoming test",
        fileName: "Study-Guide.pdf"
      },
      {
        id: 12,
        sender: "classmate4",
        fileURL: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        timestamp: "4:05 PM",
        type: "file",
        fileType: "document",
        caption: "My essay draft for feedback",
        fileName: "Essay-Draft.docx"
      }
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
        fileType: selectedFile.type.includes('image') ? 'image' : 
                selectedFile.type.includes('video') ? 'video' : 
                selectedFile.type.includes('audio') ? 'audio' : 'document',
        fileName: selectedFile.name,
        text: fileCaption,
      };
    } else if (audioBlob) {
      newMsg = {
        ...newMsg,
        type: 'file',
        fileType: 'audio',
        fileURL: URL.createObjectURL(audioBlob),
        caption: 'Voice message'
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
    setShowModal(false);
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Actual recording implementation would go here
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Create a dummy audio blob for demonstration
    const dummyAudioBlob = new Blob([], { type: 'audio/mp3' });
    setAudioBlob(dummyAudioBlob);
  };

  const handlePlayAudio = () => {
    // Audio playback implementation would go here
    console.log("Playing audio...");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
              setShowDetailsModal={() => console.log("Details modal")}
            />

            <MessageList
              messages={messages}
              messagesEndRef={messagesEndRef}
            />

            <MessageInput
              fileInputRef={fileInputRef}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={() => sendMessage(false)}
              handleOpenModal={handleOpenModal}
              isRecording={isRecording}
              handleStartRecording={handleStartRecording}
              handleStopRecording={handleStopRecording}
              audioBlob={audioBlob}
              handlePlayAudio={handlePlayAudio}
              handleKeyPress={handleKeyPress}
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
            <h3 className="text-lg font-semibold mb-4">Upload {modalType}</h3>
            <input
              type="file"
              accept={modalType === "Images" ? "image/*" : modalType === "Videos" ? "video/*" : "application/pdf, .doc, .docx"}
              onChange={(e) => handleFileChange(e, modalType.toLowerCase())}
              ref={fileInputRef}
              className="w-full p-2 border rounded"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 text-gray-700 py-1 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  sendMessage(true);
                }}
                className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;