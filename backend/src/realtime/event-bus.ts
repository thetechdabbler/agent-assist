import { Server as SocketIOServer } from 'socket.io';
import type { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

export type DomainEvent = {
  eventType: string;
  conversationId?: string;
  userId?: string;
  tenantId: string;
  correlationId?: string;
  payload: Record<string, unknown>;
};

let io: SocketIOServer | null = null;

export function initEventBus(
  httpServer: import('http').Server,
  redisPub?: Redis,
  redisSub?: Redis,
): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
  });
  if (redisPub && redisSub) {
    io.adapter(createAdapter(redisPub, redisSub));
  }
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function publishToConversation(conversationId: string, event: DomainEvent): void {
  io?.to(`conversation:${conversationId}`).emit('domain_event', event);
}

export function publishToUser(userId: string, event: DomainEvent): void {
  io?.to(`user:${userId}`).emit('domain_event', event);
}
