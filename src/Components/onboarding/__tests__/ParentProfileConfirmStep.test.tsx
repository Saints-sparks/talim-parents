import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../../test-utils/render';
import type { AuthUser } from '../../../types/auth';

const changePhoto = vi.fn();
const markStepComplete = vi.fn();
let user: AuthUser | null;
let upload: { canUpload: boolean; busy: boolean; changePhoto: typeof changePhoto };

vi.mock('../../../services/auth.services', () => ({ useAuth: () => ({ user }) }));
vi.mock('../../../hooks/useSchool', () => ({ useSchool: () => ({ data: { name: 'Grace Academy' }, isLoading: false }) }));
vi.mock('../../../hooks/useAvatarUpload', () => ({ useAvatarUpload: () => upload }));
vi.mock('../../../contexts/ParentOnboardingContext', () => ({ useParentOnboarding: () => ({ markStepComplete }) }));

import ParentProfileConfirmStep from '../ParentProfileConfirmStep';

describe('ParentProfileConfirmStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user = { userId: 'p1', firstName: 'Amina', lastName: 'Bello', email: 'amina@example.com', phoneNumber: '0800', userAvatar: 'https://img/a.png' };
    upload = { canUpload: true, busy: false, changePhoto };
  });

  it('shows the saved profile read-only, with no invented account status', () => {
    renderWithProviders(<ParentProfileConfirmStep />);
    expect(screen.getByText('Amina Bello')).toBeInTheDocument();
    expect(screen.getByText('amina@example.com')).toBeInTheDocument();
    expect(screen.getByText('0800')).toBeInTheDocument();
    expect(screen.getByText('Grace Academy')).toBeInTheDocument();
    expect(screen.queryByText(/account status/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the persisted avatar URL, not a local blob', () => {
    renderWithProviders(<ParentProfileConfirmStep />);
    expect(screen.getByRole('img', { name: 'Amina Bello' })).toHaveAttribute('src', 'https://img/a.png');
  });

  it('hands a chosen file to the upload hook', async () => {
    changePhoto.mockResolvedValue('https://img/new.png');
    const { container } = renderWithProviders(<ParentProfileConfirmStep />);
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(changePhoto).toHaveBeenCalledWith(file);
  });

  it('hides the camera button when uploads are not configured', () => {
    upload = { ...upload, canUpload: false };
    renderWithProviders(<ParentProfileConfirmStep />);
    expect(screen.queryByRole('button', { name: /upload parent avatar/i })).not.toBeInTheDocument();
  });

  it('marks the step complete on Continue', async () => {
    renderWithProviders(<ParentProfileConfirmStep />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(markStepComplete).toHaveBeenCalledWith('parent-profile');
  });
});
