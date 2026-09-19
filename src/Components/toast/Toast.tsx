import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { DEFAULT_TOAST_DURATION_MS, type ToastType } from '../../lib/toastManager';

/** How long the leave animation runs before the toast is removed. */
const LEAVE_MS = 300;

/** Look of one toast type, light and dark. */
interface ToastStyle {
  Icon: LucideIcon;
  progress: string;
  accent: string;
  iconBg: string;
  iconColor: string;
}

const STYLES: Record<ToastType, ToastStyle> = {
  success: {
    Icon: CheckCircle2,
    progress: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    accent: 'border-emerald-400 dark:border-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    Icon: XCircle,
    progress: 'bg-gradient-to-r from-red-500 to-red-600',
    accent: 'border-red-400 dark:border-red-500',
    iconBg: 'bg-red-100 dark:bg-red-500/15',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    Icon: AlertTriangle,
    progress: 'bg-gradient-to-r from-amber-500 to-amber-600',
    accent: 'border-amber-400 dark:border-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    Icon: Info,
    progress: 'bg-gradient-to-r from-[#003366] to-[#002244] dark:from-blue-400 dark:to-blue-500',
    accent: 'border-[#003366] dark:border-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-[#003366] dark:text-blue-300',
  },
};

/** Props of {@link Toast}. */
export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  onClick?: () => void;
}

/**
 * One toast card. Closes itself after `duration`, or when dismissed.
 *
 * @param props - The toast to show.
 * @returns The card.
 */
export default function Toast({
  id,
  type,
  title,
  message,
  duration = DEFAULT_TOAST_DURATION_MS,
  onClose,
  onClick,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    if (leaveTimer.current === null) {
      leaveTimer.current = setTimeout(() => onClose(id), LEAVE_MS);
    }
  }, [id, onClose]);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  // A toast that unmounts mid-leave must not call back into a stale queue.
  useEffect(
    () => () => {
      if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    },
    [],
  );

  const { Icon, ...style } = STYLES[type] ?? STYLES.info;

  const activate = (): void => {
    onClick?.();
    handleClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`relative mb-3 flex w-[calc(100vw-2rem)] max-w-md items-start rounded-xl border-l-4 bg-white p-4 shadow-lg transition-all duration-300 ease-out dark:bg-slate-800 ${style.accent} ${
        isVisible && !isLeaving ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-5 scale-95 opacity-0'
      }`}
    >
      <div className={`mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.iconBg}`}>
        <Icon className={`h-6 w-6 ${style.iconColor}`} />
      </div>

      <div
        className={`min-w-0 flex-1 ${onClick ? 'cursor-pointer' : ''}`}
        {...(onClick ? { role: 'button', tabIndex: 0, onClick: activate, onKeyDown } : {})}
      >
        {title && (
          <h4 className="mb-1 text-sm font-semibold leading-tight text-gray-900 dark:text-slate-100">{title}</h4>
        )}
        <p className="break-words text-sm leading-relaxed text-gray-700 dark:text-slate-300">{message}</p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="ml-2 flex-shrink-0 rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
        aria-label="Close notification"
      >
        <X className="h-5 w-5 text-gray-400 dark:text-slate-400" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-gray-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-br-xl ${style.progress}`}
          style={{ animation: `toast-shrink ${duration}ms linear forwards`, transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
}
