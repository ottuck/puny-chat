import { api } from '@/lib/api';

// Public contact only. The operator's notification address is configured on the server.
export const SUPPORT_EMAIL = 'support@puny-chat.com';
export const REPORT_REASONS = ['HARASSMENT', 'SEXUAL', 'THREATS', 'SPAM', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type Receipt = { id: string };

export function submitInquiry(requestId: string, description: string) {
  return api<Receipt>('/api/support/inquiries', {
    method: 'POST',
    body: { requestId, description },
  });
}

export function removePartner(input: {
  requestId: string;
  roomId: string;
  targetId: string;
  report: boolean;
  reason?: ReportReason;
  description: string;
}) {
  return api<Receipt>('/api/rooms/me/partner-removal', { method: 'POST', body: input });
}
