import { usePushNotifications } from "../../hooks/usePushNotifications";

export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Browser Notifications</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Not supported in this browser</p>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af", background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
          Unavailable
        </span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Browser Notifications</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
            Blocked by browser —{" "}
            <a
              href="https://support.google.com/chrome/answer/3220216"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#3b82f6" }}
            >
              how to enable
            </a>
          </p>
        </div>
        <span style={{ fontSize: 12, color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: 4 }}>
          Blocked
        </span>
      </div>
    );
  }

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch {
      // error displayed via hook state
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Browser Notifications</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
          {isSubscribed
            ? "Receiving school updates, fee alerts, and Talim announcements in this browser."
            : "Get notified about school announcements and important updates even when the tab is closed."}
        </p>
        {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isSubscribed ? "Disable browser notifications" : "Enable browser notifications"}
        style={{
          position: "relative",
          display: "inline-flex",
          height: 24,
          width: 44,
          flexShrink: 0,
          cursor: isLoading ? "not-allowed" : "pointer",
          borderRadius: 9999,
          border: "2px solid transparent",
          transition: "background-color 0.2s ease-in-out",
          backgroundColor: isSubscribed ? "#2563eb" : "#d1d5db",
          opacity: isLoading ? 0.5 : 1,
          outline: "none",
        }}
      >
        <span
          style={{
            pointerEvents: "none",
            display: "inline-block",
            height: 20,
            width: 20,
            transform: isSubscribed ? "translateX(20px)" : "translateX(0)",
            borderRadius: 9999,
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "transform 0.2s ease-in-out",
          }}
        />
      </button>
    </div>
  );
}
