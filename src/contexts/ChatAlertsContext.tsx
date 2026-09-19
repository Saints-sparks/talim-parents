import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../Components/CustomToast';
import { useAuth } from '../services/auth.services';
import { useWebSocketContextSafe } from './WebSocketContext';

/** What `useChatAlerts()` exposes. */
export interface ChatAlertsValue {
  /** Unread chat messages across every room; drives the sidebar badge and tab title. */
  unreadCount: number;
  /** The room the parent has open on the Messages page, if any. */
  openRoomId: string | null;
  setOpenRoomId: (roomId: string | null | undefined) => void;
}

/** A chat room as far as this file cares: enough to name it in a toast. */
interface RoomLike {
  _id?: string;
  roomId?: string;
  name?: string;
}

interface ChatRoomsUpdate {
  rooms?: RoomLike[];
}
interface ChatRoomJoined {
  room?: RoomLike;
}
interface RoomUpdated {
  roomId?: string;
  name?: string;
}
interface ParticipantsChanged {
  roomId?: string;
  removed?: string[];
  by?: string;
}
interface UnreadUpdate {
  userId?: string;
  unreadCount?: number;
}
interface ChatRoomActivity {
  roomId?: string;
  lastMessage?: { senderId?: string; senderName?: string; preview?: string };
}
/** A live notification pushed to the signed-in parent. */
interface LiveNotification {
  type?: string;
  title?: string;
  body?: string;
  message?: string;
}

const FALLBACK: ChatAlertsValue = { unreadCount: 0, openRoomId: null, setOpenRoomId: () => {} };
const ChatAlertsContext = createContext<ChatAlertsValue | null>(null);

const TITLE_PREFIX = /^\(\d+\+?\)\s*/;

/**
 * True when the user is looking at this room on the Messages page.
 *
 * @param pathname - The current route.
 * @param openRoomId - The room the Messages page has open.
 * @param roomId - The room an event is about.
 * @returns Whether the event is for the room already on screen.
 */
export const isRoomOpen = (
  pathname: string,
  openRoomId: string | null,
  roomId: string | undefined,
): boolean => pathname === '/messages' && Boolean(roomId) && openRoomId === roomId;

/**
 * A same-origin URL from a notification, as a router path.
 *
 * @param url - A URL from a service-worker message.
 * @returns The path, or `null` for another origin or an unparsable URL.
 */
function toRouterPath(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * App-wide chat signals, mounted once inside the router: the unread badge and
 * tab title, a toast for messages in rooms that are not open, a toast when
 * someone removes the parent from a group, in-app notification toasts, and
 * routing for service-worker notification clicks.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The provider element.
 */
export function ChatAlertsProvider({ children }: { children: ReactNode }) {
  const { user, parentId } = useAuth();
  const currentUserId = user?.userId ?? user?._id ?? user?.id ?? parentId;
  const webSocket = useWebSocketContextSafe();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [openRoomId, setOpenRoomIdState] = useState<string | null>(null);
  const openRoomIdRef = useRef<string | null>(null);
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  // roomId -> group name, from whatever room data passes by, for the "You were removed" toast.
  const roomNamesRef = useRef(new Map<string, string>());

  pathnameRef.current = location.pathname;
  navigateRef.current = navigate;

  const setOpenRoomId = useCallback((roomId: string | null | undefined): void => {
    openRoomIdRef.current = roomId || null;
    setOpenRoomIdState(roomId || null);
  }, []);

  useEffect(() => {
    if (!currentUserId) setUnreadCount(0);
  }, [currentUserId]);

  const isConnected = webSocket?.isConnected ?? false;
  const fetchUnreadCount = webSocket?.fetchUnreadCount;
  useEffect(() => {
    if (isConnected) fetchUnreadCount?.();
  }, [isConnected, fetchUnreadCount]);

  const subscribe = webSocket?.on;
  useEffect(() => {
    if (!subscribe) return undefined;

    const rememberRoomName = (room: RoomLike | undefined): void => {
      const roomId = room?._id ?? room?.roomId;
      if (roomId && room?.name) roomNamesRef.current.set(String(roomId), room.name);
    };

    const unsubscribers = [
      subscribe<ChatRoomsUpdate>('chat-rooms-update', (data) => data?.rooms?.forEach(rememberRoomName)),
      subscribe<ChatRoomJoined>('chat-room-joined', (data) => rememberRoomName(data?.room)),
      subscribe<RoomUpdated>('room-updated', (data) => rememberRoomName({ _id: data?.roomId, name: data?.name })),

      // Removed by someone else (leaving a group yourself has `by` = you): tell the parent wherever they are.
      subscribe<ParticipantsChanged>('participants-changed', (data) => {
        const roomId = data?.roomId && String(data.roomId);
        if (!roomId || !currentUserId) return;
        const me = String(currentUserId);
        if (!(data.removed ?? []).some((id) => String(id) === me)) return;
        if (data.by && String(data.by) === me) return;
        const name = roomNamesRef.current.get(roomId);
        toast.info(name ? `You were removed from ${name}` : 'You were removed from a group');
      }),

      subscribe<UnreadUpdate>('unread-messages-update', (data) => {
        if (data?.userId && currentUserId && String(data.userId) !== String(currentUserId)) return;
        if (typeof data?.unreadCount === 'number') setUnreadCount(Math.max(0, data.unreadCount));
      }),

      subscribe<ChatRoomActivity>('chat-room-activity', (data) => {
        const roomId = data?.roomId;
        const lastMessage = data?.lastMessage;
        if (!roomId || !lastMessage) return;
        if (String(lastMessage.senderId) === String(currentUserId)) return;
        if (isRoomOpen(pathnameRef.current, openRoomIdRef.current, roomId)) return;

        // The server follows with the exact total; this keeps the badge instant.
        setUnreadCount((count) => count + 1);
        const preview = lastMessage.preview || 'New message';
        toast.info(lastMessage.senderName ? `${lastMessage.senderName}: ${preview}` : preview, {
          title: 'New message',
          onClick: () => navigateRef.current(`/messages?room=${encodeURIComponent(roomId)}`),
        });
      }),

      subscribe<LiveNotification>('notification', (notification) => {
        // Chat alerts come from chat-room-activity.
        if (!notification || notification.type === 'chat_message') return;
        const message = notification.body || notification.message;
        if (message || notification.title) {
          toast.info(message || notification.title || '', message ? notification.title : undefined);
        }
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, currentUserId]);

  useEffect(() => {
    const baseTitle = document.title.replace(TITLE_PREFIX, '');
    document.title = unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  // A notification clicked while a tab is open: the service worker focuses it and asks it to route.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const handleMessage = (event: MessageEvent<{ type?: string; url?: string } | null>): void => {
      const { type, url } = event.data ?? {};
      if (type !== 'OPEN_URL' && type !== 'NOTIFICATION_CLICK') return;
      const path = url ? toRouterPath(url) : null;
      if (path) navigateRef.current(path);
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const value = useMemo(
    () => ({ unreadCount, openRoomId, setOpenRoomId }),
    [unreadCount, openRoomId, setOpenRoomId],
  );

  return <ChatAlertsContext.Provider value={value}>{children}</ChatAlertsContext.Provider>;
}

/**
 * The chat unread count and open-room tracking.
 *
 * @returns The chat alerts state; an inert default outside the provider.
 */
export const useChatAlerts = (): ChatAlertsValue => useContext(ChatAlertsContext) ?? FALLBACK;
