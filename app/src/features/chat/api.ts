import { api } from '@/lib/api';

import type { MessagePage } from './message-sync';

export const PAGE_SIZE = 30;
const CATCH_UP_PAGE_SIZE = 50;

export const fetchNewest = (signal?: AbortSignal) =>
  api<MessagePage>(`/api/rooms/me/messages?limit=${PAGE_SIZE}`, { signal });

export const fetchOlder = (before: string) =>
  api<MessagePage>(`/api/rooms/me/messages?limit=${PAGE_SIZE}&before=${before}`);

export const fetchNewer = (after: string, signal?: AbortSignal) =>
  api<MessagePage>(`/api/rooms/me/messages?limit=${CATCH_UP_PAGE_SIZE}&after=${after}`, { signal });
