import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Toast from '../CustomToast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes itself after its duration, once the leave animation has run', () => {
    const onClose = vi.fn();
    render(<Toast id="t1" type="success" message="Saved" duration={1000} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('t1');
  });

  it('does not call back after it has unmounted mid-leave', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Toast id="t2" type="info" message="Hi" duration={500} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('runs onClick then closes when the body is clicked', () => {
    const onClose = vi.fn();
    const onClick = vi.fn();
    render(<Toast id="t3" type="warning" title="Note" message="Open it" onClose={onClose} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Note/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClose).toHaveBeenCalledWith('t3');
  });

  it('announces errors as alerts', () => {
    render(<Toast id="t4" type="error" message="Nope" onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
  });
});
