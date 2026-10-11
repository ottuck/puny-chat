import { api } from '@/lib/api';

// Public contact and notification recipient start with the same address (server application.yaml).
export const SUPPORT_EMAIL = 'support@puny-chat.com';
export const REPORT_REASONS = ['HARASSMENT', 'SEXUAL', 'THREATS', 'SPAM', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type Receipt = { id: string };

export function submitInquiry(requestId: string, description: string, replyEmail?: string) {
  return api<Receipt>('/api/support/inquiries', {
    method: 'POST',
    body: { requestId, description, replyEmail },
  });
}

export function removePartner(input: {
  requestId: string;
  roomId: string;
  targetId: string;
  report: boolean;
  reason?: ReportReason;
  description: string;
  replyEmail?: string;
}) {
  return api<Receipt>('/api/rooms/me/partner-removal', { method: 'POST', body: input });
}
