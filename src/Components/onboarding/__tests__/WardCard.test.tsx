import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WardCard from '../WardCard';
import type { ChildSummary } from '../../../types/portal/children';

const WARD: ChildSummary = {
  id: 'c1',
  name: 'Amara Okafor',
  admissionNumber: null,
  class: { id: 'k1', name: 'JSS 1A' },
  school: { id: 's1', name: 'Easy Sparks' },
  attendanceRate: null,
  average: null,
  grade: null,
  position: null,
  outstanding: 0,
  isDefault: false,
};

describe('WardCard', () => {
  it('names the child with their class and school', () => {
    render(<WardCard ward={WARD} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Amara Okafor')).toBeInTheDocument();
    expect(screen.getByText('JSS 1A · Easy Sparks')).toBeInTheDocument();
  });

  it('says when the child has no class yet', () => {
    render(<WardCard ward={{ ...WARD, class: null }} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Class not assigned · Easy Sparks')).toBeInTheDocument();
  });

  it('selects the ward on click and reports its state', () => {
    const onSelect = vi.fn();
    render(<WardCard ward={WARD} selected onSelect={onSelect} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(WARD);
  });
});
