import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatHeader from '../ChatHeader';

const CHAT = { displayName: 'Mr Seyi Tinubu', avatarInfo: { type: 'initials' as const, value: 'ST', bgColor: '#123' }, subtitle: 'Mathematics · teacher' };

describe('ChatHeader', () => {
  it('offers Call as a tel: link only when the API gives a phone, and never a video call', () => {
    const { rerender } = render(<ChatHeader selectedChat={CHAT} onBack={vi.fn()} onToggleDetails={vi.fn()} callPhone="0803 555 0110" />);
    expect(screen.getByRole('link', { name: /Call Mr Seyi Tinubu/ })).toHaveAttribute('href', 'tel:08035550110');
    expect(screen.getByText('Mathematics · teacher')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /video/i })).not.toBeInTheDocument();

    rerender(<ChatHeader selectedChat={CHAT} onBack={vi.fn()} onToggleDetails={vi.fn()} callPhone={null} />);
    expect(screen.queryByRole('link', { name: /Call/ })).not.toBeInTheDocument();
  });
});
