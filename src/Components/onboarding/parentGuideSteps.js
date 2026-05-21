import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Shield,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

export const guideConfigs = [
  {
    id: "my-children",
    pathMatchers: ["/my-children"],
    exactOnly: true,
    steps: [
      {
        target: "children-header",
        eyebrow: "Linked wards",
        title: "My Children",
        description:
          "This page shows every child linked to your parent account, including the child currently selected for the rest of the portal.",
        icon: UsersRound,
      },
      {
        target: "children-list",
        title: "Choose the Active Child",
        description:
          "Select a child card to make that ward the active child for attendance, timetable, results, leave requests, and payments.",
        icon: UserRound,
      },
      {
        target: "children-overview",
        title: "Review the Summary",
        description:
          "The overview cards give quick signals such as linked children, average attendance, grade summary, and enrolled subjects.",
        icon: LayoutDashboard,
      },
      {
        target: "children-actions",
        title: "Use Quick Actions",
        description:
          "Jump straight to common parent tasks like checking attendance, viewing results, messaging the school, or requesting leave.",
        icon: HelpCircle,
      },
    ],
  },
  {
    id: "attendance",
    pathMatchers: ["/attendance"],
    exactOnly: true,
    steps: [
      {
        target: "attendance-header",
        eyebrow: "Daily records",
        title: "Attendance",
        description:
          "Use this page to review attendance records posted by the school for the selected child.",
        icon: CalendarCheck,
      },
      {
        target: "attendance-summary",
        title: "Understand Attendance Totals",
        description:
          "These cards summarize present, absent, late, and no-class counts for the selected month.",
        icon: LayoutDashboard,
      },
      {
        target: "attendance-controls",
        title: "Switch Month or View",
        description:
          "Move between months, change the year, and toggle between calendar and list views.",
        icon: CalendarDays,
      },
      {
        target: "attendance-records",
        title: "Open Daily Details",
        description:
          "Select a date or row to inspect the record, status, and notes shared by the school.",
        icon: FileText,
      },
      {
        target: "attendance-detail",
        title: "Selected Day Breakdown",
        description:
          "This side panel explains the selected day and shows the month trend for the active child.",
        icon: Bell,
      },
    ],
  },
  {
    id: "leave-requests",
    pathMatchers: ["/requestleave"],
    exactOnly: true,
    steps: [
      {
        target: "leave-header",
        eyebrow: "Absence workflow",
        title: "Leave Requests",
        description:
          "Submit and track absence requests for your selected child from this page.",
        icon: CalendarDays,
      },
      {
        target: "leave-new-request",
        title: "Create a New Request",
        description:
          "Start here when your child needs to be away from school. The school will review the submitted details.",
        icon: FileText,
      },
      {
        target: "leave-list",
        title: "Track Request Status",
        description:
          "Approved, pending, and rejected leave requests appear here with dates and request type.",
        icon: CalendarCheck,
      },
    ],
  },
  {
    id: "messages",
    pathMatchers: ["/messages"],
    exactOnly: true,
    steps: [
      {
        target: "messages-shell",
        eyebrow: "Communication",
        title: "Messages",
        description:
          "Messages keep parent conversations with teachers and school staff in one place.",
        icon: MessageSquareText,
      },
      {
        target: "messages-conversations",
        title: "Choose a Conversation",
        description:
          "Use the conversation list to switch between teachers, school staff, and group chats.",
        icon: UsersRound,
      },
      {
        target: "messages-chat-area",
        title: "Read and Reply",
        description:
          "The chat area shows the thread, attachments, and the input box for text, files, or voice notes.",
        icon: MessageSquareText,
      },
      {
        target: "messages-details",
        title: "Conversation Details",
        description:
          "When details are open, this panel summarizes the contact, shared media, and voice notes.",
        icon: UserRound,
      },
    ],
  },
  {
    id: "payments",
    pathMatchers: ["/payments"],
    exactOnly: true,
    steps: [
      {
        target: "payments-header",
        eyebrow: "Fees and receipts",
        title: "Payments",
        description:
          "Review outstanding fees, payment history, receipts, and available payment methods for the selected child.",
        icon: CreditCard,
      },
      {
        target: "payments-summary",
        title: "Payment Summary",
        description:
          "These cards show total outstanding fees, paid amount, receipt count, and overdue balance.",
        icon: Wallet,
      },
      {
        target: "payments-child",
        title: "Selected Child Balance",
        description:
          "This section confirms which child you are paying for and the current outstanding amount.",
        icon: UserRound,
      },
      {
        target: "payments-tabs",
        title: "Switch Payment Views",
        description:
          "Use the tabs to move between due fees, payment history, receipts, and payment methods.",
        icon: FileText,
      },
      {
        target: "payments-content",
        title: "Take Payment Actions",
        description:
          "Select fees, pay now, view receipts, or review previous transactions in this content area.",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "timetable",
    pathMatchers: ["/timetable"],
    exactOnly: true,
    steps: [
      {
        target: "timetable-header",
        eyebrow: "Class schedule",
        title: "Timetable",
        description:
          "This page shows the weekly class schedule for the selected child.",
        icon: CalendarDays,
      },
      {
        target: "timetable-child",
        title: "Confirm the Child",
        description:
          "Use this card and selector to switch the child whose timetable you want to inspect.",
        icon: UserRound,
      },
      {
        target: "timetable-controls",
        title: "Change Week or View",
        description:
          "Move between weeks and switch from weekly grid to list view when you need a simpler scan.",
        icon: CalendarCheck,
      },
      {
        target: "timetable-grid",
        title: "Read the Schedule",
        description:
          "Class blocks show subjects, teachers, class, and time slots posted by the school.",
        icon: FileText,
      },
      {
        target: "timetable-sidecards",
        title: "Today and Class Info",
        description:
          "The side cards summarize today’s schedule and key class information for the selected child.",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "settings",
    pathMatchers: ["/settings"],
    exactOnly: true,
    steps: [
      {
        target: "settings-header",
        eyebrow: "Account preferences",
        title: "Settings",
        description:
          "Manage your profile, children, security, notifications, theme, and support options here.",
        icon: Settings,
      },
      {
        target: "settings-profile",
        title: "Profile Information",
        description:
          "Review your parent profile and edit fields that are available in the parent portal.",
        icon: UserRound,
      },
      {
        target: "settings-children",
        title: "Linked Children",
        description:
          "This section lists children connected to your account and shows their class and status.",
        icon: UsersRound,
      },
      {
        target: "settings-security",
        title: "Security Settings",
        description:
          "Update your password, phone number, and future two-factor settings from this section.",
        icon: Shield,
      },
      {
        target: "settings-preferences",
        title: "Preferences",
        description:
          "Control notifications and choose the app theme, including light, dark, or system mode.",
        icon: Bell,
      },
    ],
  },
];

export function findGuideConfig(pathname) {
  return guideConfigs.find((config) =>
    config.pathMatchers.some((matcher) =>
      config.exactOnly ? pathname === matcher : pathname.startsWith(matcher)
    )
  );
}
