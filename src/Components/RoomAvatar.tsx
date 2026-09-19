import type { AvatarInfo } from '../types/chat';

/** How large the avatar is drawn: the list/header size, or the details panel's. */
type RoomAvatarSize = 'md' | 'xl';

const IMAGE_SIZE: Record<RoomAvatarSize, string> = {
  md: 'h-11 w-11 shrink-0 rounded-full object-cover',
  xl: 'mx-auto h-20 w-20 rounded-full object-cover',
};
const INITIALS_SIZE: Record<RoomAvatarSize, string> = {
  md: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
  xl: 'mx-auto flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white',
};

/**
 * A room's picture, or its initials on the colour derived from its name.
 *
 * @param props - Component props.
 * @param props.info - The avatar the room derived (`toChatRoom`), if any.
 * @param props.size - `md` for the list and header, `xl` for the details panel.
 * @returns The avatar.
 */
export default function RoomAvatar({ info, size = 'md' }: { info: AvatarInfo | null | undefined; size?: RoomAvatarSize }) {
  if (info?.type === 'image') {
    return <img src={info.value} alt="" className={IMAGE_SIZE[size]} />;
  }
  return (
    <span className={INITIALS_SIZE[size]} style={{ backgroundColor: info?.bgColor || '#0A4EA3' }}>
      {info?.value || 'U'}
    </span>
  );
}
