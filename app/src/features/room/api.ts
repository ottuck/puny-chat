import type { BuddyJob, BuddyView } from '@/features/buddy/api';
import { api, ApiError } from '@/lib/api';

// Shapes returned by the server (server/src/main/java/com/buddychat/room/RoomView.java).
export type Me = {
  id: string;
  displayName: string | null;
  roomId: string | null;
  // The newest guide card version this user has opened, on any device (0 for none).
  guideSeenVersion?: number;
};
export type RoomMember = { id: string; displayName: string | null };
// A buddy that grew up and went its own way, kept in the room's album.
export type AlbumEntry = {
  name: string;
  bornAt: string;
  graduatedAt: string;
  // The job it grew into; null for those who left before jobs existed.
  job?: BuddyJob | null;
};
export type Room = {
  id: string;
  members: RoomMember[];
  buddy: BuddyView;
  createdAt: string;
  album: AlbumEntry[];
};
export type Invitation = { code: string; expiresAt: string };

export const fetchMe = () => api<Me>('/api/me');

// The name others see. Guests start without one (server: User.MAX_NAME_LENGTH).
export const MAX_DISPLAY_NAME = 20;
export const updateMyName = (displayName: string) =>
  api<Me>('/api/me', { method: 'PATCH', body: { displayName } });

// The guide card above the chat was opened (server keeps the highest version).
export const markGuideSeen = (version: number) =>
  api<Me>('/api/me/guide-seen', { method: 'PUT', body: { version } });

export const fetchRoom = () => api<Room>('/api/rooms/me');

export const createRoom = (buddyName: string) =>
  api<Room>('/api/rooms', { method: 'POST', body: { buddyName } });

// Leaves the room: the partner keeps the room and buddy; a solo room is deleted.
export const leaveRoom = () => api<void>('/api/rooms/me/leave', { method: 'POST' });

// `self`: a code for me, to go on somewhere else (another app, browser or phone) in my seat.
export const createInvitation = (self = false) =>
  api<Invitation>('/api/rooms/me/invitations', { method: 'POST', body: { self } });

// Accepting runs several steps on the server without a transaction. If it fails midway (network,
// 5xx), the same user accepting the same code again finishes it (docs/PROJECT.md), so it is
// retried a couple of times rather than leaving the friend's room half-joined.
// `takeSeat`: said yes to coming in as the one a code is for (it takes their seat).
export async function acceptInvitation(
  code: string,
  leaveCurrentRoom: boolean,
  takeSeat = false,
): Promise<Room> {
  const request = () =>
    api<Room>(`/api/invitations/${encodeURIComponent(code.trim())}/accept`, {
      method: 'POST',
      body: { leaveCurrentRoom, takeSeat },
    });
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (e) {
      const retryable = e instanceof ApiError && (e.status === 0 || e.status >= 500);
      if (!retryable || attempt > ACCEPT_RETRIES) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

const ACCEPT_RETRIES = 2;
