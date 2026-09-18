import { useEffect } from 'react';

/**
 * Stops the page behind a modal from scrolling, and restores it — including
 * the exact scroll position — when the modal closes.
 *
 * Setting `overflow: hidden` alone makes the page jump to the top on iOS and
 * shifts the layout by the scrollbar width on desktop, so this pins the body
 * in place and puts it back.
 *
 * @param locked - Whether the modal is open.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
