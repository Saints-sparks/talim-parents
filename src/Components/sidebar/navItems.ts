import type { ComponentType } from 'react';
import { RiHome5Line } from 'react-icons/ri';
import { PiCalendarDotsLight } from 'react-icons/pi';
import { SlBadge } from 'react-icons/sl';
import { TbMessageDots } from 'react-icons/tb';
import { IoMdNotificationsOutline, IoMdTime } from 'react-icons/io';
import { MdOutlinePayments, MdOutlineSettings, MdOutlineFamilyRestroom } from 'react-icons/md';
import LeaveRequestIcon from '../../lib/ui/LeaveRequestIcon';

/** One entry in the sidebar. */
export interface NavItem {
  path: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  /** Set on the entries that carry an unread badge. */
  badgeKey?: 'messages';
}

/** Every page a parent can open from the sidebar, in order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', name: 'Dashboard', icon: RiHome5Line },
  { path: '/my-children', name: 'My Children', icon: MdOutlineFamilyRestroom },
  { path: '/attendance', name: 'Attendance', icon: PiCalendarDotsLight },
  { path: '/timetable', name: 'Timetable', icon: IoMdTime },
  { path: '/result', name: 'Results', icon: SlBadge },
  { path: '/requestleave', name: 'Leave Requests', icon: LeaveRequestIcon },
  { path: '/messages', name: 'Messages', icon: TbMessageDots, badgeKey: 'messages' },
  { path: '/notifications', name: 'Notifications', icon: IoMdNotificationsOutline },
  { path: '/payments', name: 'Payments', icon: MdOutlinePayments },
  { path: '/settings', name: 'Settings', icon: MdOutlineSettings },
];
