import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../services/auth.services';
import { setProfileAvatar } from '../services/settings.services';
import {
  getCloudinaryConfig,
  ImageUploadError,
  uploadImage,
  validateImageFile,
} from '../lib/cloudinary';
import { getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../lib/queryKeys';
import { logger } from '../lib/logger';
import { toast } from '../Components/CustomToast';

/** What `useAvatarUpload()` exposes. */
export interface AvatarUploadControls {
  /** False when the deployment has no image host configured; hide the control. */
  canUpload: boolean;
  /** True while a photo is being uploaded or removed. */
  busy: boolean;
  /**
   * Validates, uploads and saves a new profile photo.
   *
   * @returns The stored URL, or `null` when it failed (the parent was told why).
   */
  changePhoto: (file: File) => Promise<string | null>;
  /**
   * Removes the profile photo on the server, so it stays removed after a reload.
   *
   * @returns Whether the removal was saved.
   */
  removePhoto: () => Promise<boolean>;
}

/**
 * Changes or removes the signed-in parent's profile photo.
 *
 * Uploads go to the image host first, then the resulting URL is saved with
 * `PUT /auth/profile/avatar`; the session user and the cached settings are
 * updated only after the server accepted it, so the header never shows a photo
 * that was not saved. Removal sends an empty `avatarUrl`, which the API treats
 * as an explicit remove.
 *
 * @returns The controls and their busy state.
 */
export function useAvatarUpload(): AvatarUploadControls {
  const { updateUser, parentId } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const syncCaches = useCallback(
    (url: string) => {
      updateUser({ userAvatar: url });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.parent(parentId || 'anon') });
    },
    [parentId, queryClient, updateUser],
  );

  const changePhoto = useCallback(
    async (file: File): Promise<string | null> => {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(problem);
        return null;
      }
      setBusy(true);
      try {
        const hosted = await uploadImage(file);
        const saved = await setProfileAvatar(hosted);
        const url = saved.userAvatar || hosted;
        syncCaches(url);
        toast.success('Profile photo updated.');
        return url;
      } catch (error) {
        logger.error('profile', 'Could not update the profile photo', error);
        toast.error(
          error instanceof ImageUploadError ? error.message : getErrorMessage(error, 'Could not update your photo.'),
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [syncCaches],
  );

  const removePhoto = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      await setProfileAvatar('');
      syncCaches('');
      toast.success('Profile photo removed.');
      return true;
    } catch (error) {
      logger.error('profile', 'Could not remove the profile photo', error);
      toast.error(getErrorMessage(error, 'Could not remove your photo.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [syncCaches]);

  return { canUpload: getCloudinaryConfig() !== null, busy, changePhoto, removePhoto };
}
