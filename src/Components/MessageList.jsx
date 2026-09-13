/* eslint-disable react/prop-types */
import { Fragment, useLayoutEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import { formatDaySeparator } from "../lib/chatMessages";

const NEAR_BOTTOM_PX = 120;
const LOAD_OLDER_THRESHOLD_PX = 80;

const keyOf = (message) => message?._id || message?.clientMessageId || null;
const dayOf = (message) => (message?.createdAt ? new Date(message.createdAt).toDateString() : "");

/**
 * Opens at the newest message, holds its place while older pages are added
 * above, and only follows new messages when the reader is near the bottom
 * (or just sent one).
 */
function MessageList({
  messages = [],
  isLoading,
  error,
  onRetry,
  hasMore,
  loadingOlder,
  olderError,
  onLoadOlder,
  onRetryMessage,
  onDiscardMessage,
}) {
  const containerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const snapshotRef = useRef({ count: 0, firstKey: null, lastKey: null, scrollHeight: 0 });

  const rememberHeight = () => {
    if (containerRef.current) snapshotRef.current.scrollHeight = containerRef.current.scrollHeight;
  };

  const handleScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    rememberHeight();
    if (element.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMore && !loadingOlder && !olderError) onLoadOlder?.();
  };

  // Media finishing loading grows the list; stay pinned to the bottom if the reader was there.
  const handleMediaLoad = () => {
    const element = containerRef.current;
    if (element && nearBottomRef.current) element.scrollTop = element.scrollHeight;
    rememberHeight();
  };

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const previous = snapshotRef.current;
    const firstKey = keyOf(messages[0]);
    const lastKey = keyOf(messages[messages.length - 1]);

    if (messages.length) {
      if (!previous.count) {
        element.scrollTop = element.scrollHeight;
        nearBottomRef.current = true;
      } else if (firstKey !== previous.firstKey && lastKey === previous.lastKey) {
        // Older messages were added above: keep what the reader was looking at in place.
        element.scrollTop += element.scrollHeight - previous.scrollHeight;
      } else if (lastKey !== previous.lastKey) {
        const last = messages[messages.length - 1];
        if (nearBottomRef.current || (last?.isOwn && last.status === "pending")) {
          element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
          nearBottomRef.current = true;
        }
      }
    }

    snapshotRef.current = { count: messages.length, firstKey, lastKey, scrollHeight: element.scrollHeight };
  }, [messages]);

  const renderBody = () => {
    if (isLoading && !messages.length) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 w-2/3 animate-pulse rounded-2xl bg-[#E5EAF2]" />
          ))}
        </div>
      );
    }

    if (error && !messages.length) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-[#667085]">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-[#0A4EA3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083F83]"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!messages.length) {
      return (
        <div className="flex h-full items-center justify-center text-center text-sm text-[#667085]">
          No messages in this conversation yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {(hasMore || loadingOlder || olderError) && (
          <div className="flex justify-center text-xs text-[#667085]">
            {loadingOlder ? (
              <span>Loading earlier messages…</span>
            ) : olderError ? (
              <span>
                {olderError} ·{" "}
                <button type="button" onClick={onLoadOlder} className="font-semibold text-[#0A4EA3] underline">
                  Try again
                </button>
              </span>
            ) : (
              <button type="button" onClick={onLoadOlder} className="font-semibold text-[#0A4EA3] hover:underline">
                Load earlier messages
              </button>
            )}
          </div>
        )}
        {messages.map((msg, index) => {
          const day = dayOf(msg);
          const showDay = day && day !== dayOf(messages[index - 1]);
          return (
            <Fragment key={keyOf(msg) || index}>
              {showDay && (
                <div className="flex items-center gap-3 text-xs font-semibold text-[#98A2B3]">
                  <span className="h-px flex-1 bg-[#E5EAF2]" />
                  {formatDaySeparator(msg.createdAt)}
                  <span className="h-px flex-1 bg-[#E5EAF2]" />
                </div>
              )}
              <MessageItem msg={msg} onRetry={onRetryMessage} onDiscard={onDiscardMessage} />
            </Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onLoadCapture={handleMediaLoad}
      onLoadedMetadataCapture={handleMediaLoad}
      style={{ overflowAnchor: "none" }}
      className="flex-1 overflow-y-auto overscroll-y-contain bg-[#F8FAFD] p-4 md:p-6"
    >
      {renderBody()}
    </div>
  );
}

export default MessageList;
