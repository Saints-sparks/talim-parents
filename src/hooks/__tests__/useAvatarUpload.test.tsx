import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const updateUser = vi.fn();
const setProfileAvatar = vi.fn();
const uploadImage = vi.fn();
vi.mock('../../services/auth.services', () => ({ useAuth: () => ({ updateUser, parentId: 'p1' }) }));
vi.mock('../../services/settings.services', () => ({ setProfileAvatar: (...a: unknown[]) => setProfileAvatar(...a) }));
vi.mock('../../lib/cloudinary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/cloudinary')>()),
  uploadImage: (...a: unknown[]) => uploadImage(...a),
  getCloudinaryConfig: () => ({ cloudName: 'c', uploadPreset: 'p' }),
}));

import { useAvatarUpload } from '../useAvatarUpload';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useAvatarUpload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes the photo on the server with an empty avatarUrl, then clears it locally', async () => {
    setProfileAvatar.mockResolvedValue({ message: 'ok', userAvatar: '' });
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });
    let ok = false;
    await act(async () => {
      ok = await result.current.removePhoto();
    });
    expect(ok).toBe(true);
    expect(setProfileAvatar).toHaveBeenCalledWith('');
    expect(updateUser).toHaveBeenCalledWith({ userAvatar: '' });
  });

  it('does not touch the session when the removal fails', async () => {
    setProfileAvatar.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });
    await act(async () => {
      await result.current.removePhoto();
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('saves the hosted URL only after the upload succeeded', async () => {
    uploadImage.mockResolvedValue('https://res.cloudinary.com/x.png');
    setProfileAvatar.mockResolvedValue({ message: 'ok', userAvatar: 'https://res.cloudinary.com/x.png' });
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });
    await act(async () => {
      await result.current.changePhoto(new File(['x'], 'a.png', { type: 'image/png' }));
    });
    expect(setProfileAvatar).toHaveBeenCalledWith('https://res.cloudinary.com/x.png');
    expect(updateUser).toHaveBeenCalledWith({ userAvatar: 'https://res.cloudinary.com/x.png' });
  });

  it('rejects a non-image before uploading anything', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });
    await act(async () => {
      await result.current.changePhoto(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    });
    expect(uploadImage).not.toHaveBeenCalled();
  });
});
