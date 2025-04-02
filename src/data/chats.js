export const chats = [
    {
      id: 1,
      name: "Mrs. Yetunde Adebayo",
      time: "4:00pm",
      message: "typing...",
      status: "typing", // Possible values: 'typing', 'sent', 'delivered', 'read'
      profilePic:
        "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      isGroup: false, // Indicates whether the chat is a group chat
      unreadCount: 0, // Number of unread messages
      lastSeen: "3:59pm", // Last seen timestamp for the user
    },
    {
      id: 2,
      name: "John Doe",
      time: "2:45pm",
      message: "See you tomorrow!",
      status: "sent",
      profilePic: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      isGroup: false,
      unreadCount: 2,
      lastSeen: "2:30pm",
    },
    {
      id: 3,
      name: "End of year party planning",
      time: "1:30pm",
      message: "Let's have a quick call in 10 minutes.",
      status: "delivered",
      profilePic: "https://i.pravatar.cc/150?u=team-devmeet",
      isGroup: true, // Group chat
      unreadCount: 5,
      lastSeen: null, 
    },
    {
      id: 4,
      name: "Sarah Williams",
      time: "Yesterday",
      message: "Can you review my PR?",
      status: "read",
      profilePic: "https://i.pravatar.cc/150?u=sarahwilliams",
      isGroup: false,
      unreadCount: 0,
      lastSeen: "Yesterday, 10:00pm",
    },
    {
      id: 5,
      name: "Project Alpha",
      time: "Sunday",
      message: "Meeting scheduled for Monday at 9 AM.",
      status: "read",
      profilePic: "https://i.pravatar.cc/150?u=projectalpha",
      isGroup: true,
      unreadCount: 10,
      lastSeen: null,
    },
  ];