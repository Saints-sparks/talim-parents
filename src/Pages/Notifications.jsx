import React from 'react';
import logo from '/public/not.svg';

function Notifications() {
  return (
    <div className='p-6 '>
      {/* Main Heading */}
      <h1 className="text-[20px] font-semibold">Notifications</h1>

      {/* Notification Box */}
      <div className="mt-10 bg-white h-screen rounded-[10px] flex flex-col justify-center items-center">
        {/* Image */}
        <img src={logo} alt="logo" className="mb-4" />
        
        {/* Text Below the Image */}
        {/* <h2 className="text-[20px] font-bold mb-2">No Notifications Yet</h2> */}
        <p className="text-center text-gray-600">
        There are no new updates for now.
        </p>
      </div>
    </div>
  );
}

export default Notifications;
