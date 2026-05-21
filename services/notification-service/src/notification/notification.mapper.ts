import { Notification } from '../generated/prisma';

export type NotificationDto = Readonly<{
  channel: string;
  content: string;
  createdAt: string;
  id: string;
  metadata?: unknown;
  sentAt?: string;
  status: string;
  subject: string;
  type: string;
  userId: string;
}>;

export function mapNotification(notification: Notification): NotificationDto {
  return {
    channel: notification.channel,
    content: notification.content,
    createdAt: notification.createdAt.toISOString(),
    id: notification.id,
    metadata: notification.metadata ?? undefined,
    sentAt: notification.sentAt?.toISOString(),
    status: notification.status,
    subject: notification.subject,
    type: notification.type,
    userId: notification.userId,
  };
}
