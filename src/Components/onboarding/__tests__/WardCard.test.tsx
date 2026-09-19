import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WardCard from '../WardCard';

describe('WardCard', () => {
  it('derives the badge from isActive', () => {
    const { rerender } = render(<WardCard ward={{ childId: 'c1', firstName: 'A', isActive: true }} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    rerender(<WardCard ward={{ childId: 'c1', firstName: 'A', isActive: false }} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows no badge when the status is unknown, rather than assuming Active', () => {
    render(<WardCard ward={{ childId: 'c1', firstName: 'A' }} selected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  });

  it('selects the ward on click and reports its state', () => {
    const onSelect = vi.fn();
    const ward = { childId: 'c1', firstName: 'A' };
    render(<WardCard ward={ward} selected onSelect={onSelect} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(ward);
  });
});
