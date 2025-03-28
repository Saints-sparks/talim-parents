import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { dummyNotifications } from "../data/notifications";
import { IoIosArrowBack } from "react-icons/io";

function NotificationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = dummyNotifications.find((n) => n.id === Number(id));

  const [reply, setReply] = useState("");

  if (!notification) {
    return <div className="p-6 text-center">Notification not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-gray-600">
        <IoIosArrowBack size={20} className='text-[#003366] w-5 h-5' />
     
      </button>

      {/* Notification Title */}
      <h1 className="text-md font-normal">{notification.title}</h1>
      <hr className="my-2" />

      {/* Sender Details */}
      <div className="flex items-center gap-3">
        <img
          src={notification.senderProfile}
          alt={notification.sender}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{notification.sender}</p>
          <p className="text-sm text-gray-500">{notification.time}</p>
        </div>
      </div>

      {/* Notification Content */}
      <div className="mt-4 text-gray-700">{notification.message}</div>

      {/* Reply Section */}
      <input
        className="w-full border-b border-gray-300 p-2 text-sm mt-10 focus:outline-none"
        placeholder="Reply here if you have a question or response..."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />

      <div className="text-right mt-3">
        <button
          className={`px-4 py-2 rounded-lg text-sm text-white ${
            reply.trim() ? "bg-blue-400 hover:bg-blue-500" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!reply.trim()} 
        >
          Reply
        </button>
      </div>
    </div>
  );
}

export default NotificationDetail;
