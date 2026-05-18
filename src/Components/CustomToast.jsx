import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const normalizeOptions = (titleOrOptions, duration) => {
  if (typeof titleOrOptions === "string") {
    return { title: titleOrOptions, duration };
  }

  return {
    title: titleOrOptions?.title,
    duration: titleOrOptions?.duration ?? duration,
  };
};

function Toast({ id, type, title, message, duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          Icon: CheckCircle2,
          progress: "bg-gradient-to-r from-emerald-500 to-emerald-600",
          accent: "border-emerald-400",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
        };
      case "error":
        return {
          Icon: XCircle,
          progress: "bg-gradient-to-r from-red-500 to-red-600",
          accent: "border-red-400",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
        };
      case "warning":
        return {
          Icon: AlertTriangle,
          progress: "bg-gradient-to-r from-amber-500 to-amber-600",
          accent: "border-amber-400",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
        };
      default:
        return {
          Icon: Info,
          progress: "bg-gradient-to-r from-[#003366] to-[#002244]",
          accent: "border-[#003366]",
          iconBg: "bg-blue-100",
          iconColor: "text-[#003366]",
        };
    }
  };

  const { Icon, ...config } = getToastConfig();

  return (
    <div
      className={`
        relative mb-3 flex w-[calc(100vw-2rem)] max-w-md items-start rounded-xl border-l-4 bg-white p-4 shadow-lg
        transition-all duration-300 ease-out
        ${config.accent}
        ${
          isVisible && !isLeaving
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-5 scale-95 opacity-0"
        }
      `}
    >
      <div
        className={`mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
      >
        <Icon className={`h-6 w-6 ${config.iconColor}`} />
      </div>

      <div className="min-w-0 flex-1">
        {title && (
          <h4 className="mb-1 text-sm font-semibold leading-tight text-gray-900">
            {title}
          </h4>
        )}
        <p className="break-words text-sm leading-relaxed text-gray-700">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="ml-2 flex-shrink-0 rounded-full p-1 transition-colors hover:bg-gray-100"
        aria-label="Close notification"
      >
        <X className="h-5 w-5 text-gray-400" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-gray-100">
        <div
          className={`h-full rounded-br-xl ${config.progress}`}
          style={{
            animation: `toast-shrink ${duration}ms linear forwards`,
            transformOrigin: "left",
          }}
        />
      </div>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-5 z-[9999] -translate-x-1/2">
      <div className="pointer-events-auto flex max-h-screen flex-col items-center overflow-hidden">
        {toasts.map((item) => (
          <Toast key={item.id} {...item} onClose={onRemove} />
        ))}
      </div>
    </div>,
    document.body
  );
}

let toastId = 0;

class ToastManager {
  listeners = new Set();
  toasts = [];

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.toasts;
  }

  addToast(toastItem) {
    const nextToast = {
      ...toastItem,
      id: `toast-${++toastId}`,
      onClose: this.removeToast,
    };
    this.toasts = [nextToast, ...this.toasts].slice(0, 5);
    this.emit();
  }

  removeToast = (id) => {
    this.toasts = this.toasts.filter((item) => item.id !== id);
    this.emit();
  };

  emit() {
    this.listeners.forEach((listener) => listener(this.toasts));
  }
}

const toastManager = new ToastManager();

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    setToasts(toastManager.getSnapshot());
    return unsubscribe;
  }, []);

  return { toast, toasts, removeToast: toastManager.removeToast };
};

export const ToastViewport = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
};

const showToast = (type, message, titleOrOptions, duration) => {
  const options = normalizeOptions(titleOrOptions, duration);
  toastManager.addToast({ type, message, ...options });
};

export const toast = Object.assign(
  (message, titleOrOptions, duration) =>
    showToast("info", message, titleOrOptions, duration),
  {
    success: (message, titleOrOptions, duration) =>
      showToast("success", message, titleOrOptions, duration),
    error: (message, titleOrOptions, duration) =>
      showToast("error", message, titleOrOptions, duration),
    warning: (message, titleOrOptions, duration) =>
      showToast("warning", message, titleOrOptions, duration),
    info: (message, titleOrOptions, duration) =>
      showToast("info", message, titleOrOptions, duration),
  }
);

export default Toast;
