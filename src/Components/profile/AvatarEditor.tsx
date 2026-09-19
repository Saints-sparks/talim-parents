import { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../lib/ui/avatar';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { cn } from '../../lib/utils';

/**
 * A profile photo with change and remove controls. Both act immediately and
 * persist on the server (`PUT /auth/profile/avatar`), so what the parent sees is
 * what is saved. The controls are hidden when the deployment has no image host.
 *
 * @param props - Component props.
 * @param props.src - The current photo URL, if any.
 * @param props.name - The parent's name, for the alt text.
 * @param props.initials - Shown when there is no photo.
 * @param props.sizeClass - Tailwind size classes for the avatar.
 * @param props.textClass - Tailwind text classes for the initials.
 * @param props.showRemove - Whether to offer a "Remove photo" button beneath.
 * @returns The avatar and its controls.
 */
export function AvatarEditor({
  src,
  name,
  initials,
  sizeClass = 'h-28 w-28',
  textClass = 'text-3xl',
  showRemove = false,
}: {
  src?: string | null;
  name: string;
  initials: string;
  sizeClass?: string;
  textClass?: string;
  showRemove?: boolean;
}) {
  const { canUpload, busy, changePhoto, removePhoto } = useAvatarUpload();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar className={cn(sizeClass, 'border-4 border-white shadow-sm dark:border-slate-800')}>
          {src ? (
            <AvatarImage src={src} alt={name} />
          ) : (
            <AvatarFallback
              className={cn('bg-[#F5E9E2] font-bold text-[#7A4B33] dark:bg-slate-700 dark:text-amber-200', textClass)}
            >
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        {canUpload && (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              aria-label="Upload profile photo"
              className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE5F2] bg-white text-[#0A4EA3] shadow-sm hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void changePhoto(file);
              }}
            />
          </>
        )}
      </div>
      {showRemove && src && (
        <button
          type="button"
          onClick={() => void removePhoto()}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove photo
        </button>
      )}
      {busy && <p className="mt-2 text-xs text-[#667085] dark:text-slate-400">Saving photo...</p>}
    </div>
  );
}
