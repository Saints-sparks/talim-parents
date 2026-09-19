import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils/render';
import type { ParentSettings } from '../../services/settings.services';

const getParentSettings = vi.fn();
const setDefaultChild = vi.fn();
const updateSelectedStudent = vi.fn();
const removePhoto = vi.fn();

const CHILD = { childId: 'c1', firstName: 'Chidi', lastName: 'Bello', className: 'JSS 1', isActive: true };

vi.mock('../../services/auth.services', () => ({
  useAuth: () => ({ user: { firstName: 'Amina', lastName: 'Bello' }, parentId: 'p1', updateUser: vi.fn(), changePassword: vi.fn() }),
}));
vi.mock('../../hooks/useSchool', () => ({
  useSchool: () => ({ data: { name: 'Grace Academy', email: 'office@grace.test', address: '1 School Rd' }, isLoading: false }),
}));
vi.mock('../../hooks/useAvatarUpload', () => ({
  useAvatarUpload: () => ({ canUpload: true, busy: false, changePhoto: vi.fn(), removePhoto }),
}));
vi.mock('../../contexts/ParentOnboardingContext', () => ({
  useParentOnboarding: () => ({ wards: [CHILD], wardsLoading: false, refreshWards: vi.fn() }),
}));
vi.mock('../../contexts/SelectedStudentContext', () => ({
  useSelectedStudent: () => ({ selectedStudent: null, updateSelectedStudent }),
}));
vi.mock('../../services/settings.services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/settings.services')>()),
  getParentSettings: () => getParentSettings(),
}));
vi.mock('../../services/parent.services', () => ({
  getParentByUserId: () => Promise.resolve({ createdAt: '2024-03-04T12:00:00.000Z' }),
  setDefaultChild: (...a: unknown[]) => setDefaultChild(...a),
}));

import Profile from '../Profile';

const SETTINGS: ParentSettings = {
  profile: {
    id: 'p1',
    fullName: 'Amina Bello',
    email: 'amina@example.com',
    phoneNumber: '08012345678',
    avatar: 'https://img.test/a.png',
    role: 'parent',
    isEmailVerified: true,
    isPhoneVerified: false,
  },
  children: [],
  preferences: { notifications: {}, theme: 'system' },
  security: { twoFactorEnabled: false, emailOtpEnabled: true, lastPasswordChangedAt: null },
};

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    getParentSettings.mockResolvedValue(SETTINGS);
  });

  it('shows real account data, with the email read-only and verified only where the API says so', async () => {
    renderWithProviders(<Profile />);
    expect(await screen.findAllByText('amina@example.com')).not.toHaveLength(0);
    expect(await screen.findByText('March 4, 2024')).toBeInTheDocument();
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0);
    // The phone number is never badged: the API reports it as unverified.
    expect(screen.getByText('08012345678').parentElement).not.toHaveTextContent(/verified/i);
  });

  it('removes the photo through the persisting hook', async () => {
    removePhoto.mockResolvedValue(true);
    renderWithProviders(<Profile />);
    await userEvent.click(await screen.findByRole('button', { name: /remove photo/i }));
    expect(removePhoto).toHaveBeenCalled();
  });

  it('has no stub buttons: no "link another child", and contacting the school is a real mailto', async () => {
    renderWithProviders(<Profile />);
    await screen.findByText('My Profile');
    expect(screen.queryByText(/link another child/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact school admin/i })).toHaveAttribute('href', 'mailto:office@grace.test');
  });

  it('makes a child the default on the server before changing it on the device', async () => {
    setDefaultChild.mockResolvedValue({ childId: 'c1', message: 'ok' });
    renderWithProviders(<Profile />);
    await userEvent.click(await screen.findByRole('button', { name: /chidi bello/i }));
    await waitFor(() => expect(updateSelectedStudent).toHaveBeenCalledWith(CHILD));
    expect(setDefaultChild).toHaveBeenCalledWith('c1');
  });

  it('leaves the local selection alone when the server refuses', async () => {
    setDefaultChild.mockRejectedValue(new Error('nope'));
    renderWithProviders(<Profile />);
    await userEvent.click(await screen.findByRole('button', { name: /chidi bello/i }));
    await waitFor(() => expect(setDefaultChild).toHaveBeenCalled());
    expect(updateSelectedStudent).not.toHaveBeenCalled();
  });
});
