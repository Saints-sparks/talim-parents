import React from 'react'
import logo from '../images/r.png'

function Messages() {
  return (
    <div className='p-6'>
      <h1 className='text-[20px]'>MESSAGE</h1>
      <div className='p-8 bg-white h-screen rounded-[10px] flex justify-center items-center'>
      <img src={logo} alt="logo" />
      </div>   
    </div>
  )
}

export default Messages
