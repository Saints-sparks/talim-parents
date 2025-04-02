import MessagesSidebar from '../Components/MessagesSidebar';
import ChatDetailsModal from '../Components/ChatDetailsModal'
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
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileCaption, setFileCaption] = useState('');

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);

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

  const toggleDropdown = (messageId) => {
    setOpenDropdownId(openDropdownId === messageId ? null : messageId);
  };

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
  
  const sendMessage = (withFile = false) => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

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
    setShowFilePreview(false);
    setFileCaption('');
  
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !showFilePreview) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileURL = URL.createObjectURL(file);
      setSelectedFile(file);
      setFilePreview(fileURL);
      setShowFilePreview(true);
      setFileCaption('');
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setShowSidebar(false);
  };

  const handleCancelFilePreview = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setShowFilePreview(false);
    setFileCaption('');
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
              setShowDetailsModal={setShowDetailsModal}
            />

            {showDetailsModal && (
              <ChatDetailsModal 
                chat={selectedChat} 
                onClose={() => setShowDetailsModal(false)} 
              />
            )}

            <MessageList
              messages={messages}
              openDropdownId={openDropdownId}
              toggleDropdown={toggleDropdown}
              handleReplyMessage={handleReplyMessage}
              handleForwardMessage={handleForwardMessage}
              handleDeleteMessage={handleDeleteMessage}
              replyingTo={replyingTo}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              setMessages={setMessages}
              setReplyingTo={setReplyingTo}
              sendMessage={sendMessage}
            />

            {showFilePreview && selectedFile && (
              <FilePreview
                file={selectedFile}
                filePreview={filePreview}
                caption={fileCaption}
                setCaption={setFileCaption}
                onSend={() => sendMessage(true)}
                onCancel={handleCancelFilePreview}
              />
            )}

            <MessageInput
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleKeyPress={handleKeyPress}
              sendMessage={() => sendMessage(false)}
              isRecording={isRecording}
              handleStartRecording={handleStartRecording}
              handleStopRecording={handleStopRecording}
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
    </div>
  );
}

export default Messages;