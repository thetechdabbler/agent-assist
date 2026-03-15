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
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    if (!token) return next(new Error('auth_required'));
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    import('jose')
      .then((jose) => jose.jwtVerify(token as string, secret))
      .then(({ payload }) => {
        (socket as unknown as { data: { userId?: string; tenantId?: string } }).data = {
          userId: payload.sub as string,
          tenantId: payload.tenantId as string,
        };
        next();
      })
      .catch(() => next(new Error('invalid_token')));
  });
  io.on('connection', (socket) => {
    const data = (socket as unknown as { data: { userId?: string; tenantId?: string } }).data;
    const userId = data?.userId;
    if (userId) socket.join(`user:${userId}`);
    socket.on('join_conversation', (conversationId: string) => {
      if (typeof conversationId !== 'string') return;
      socket.join(`conversation:${conversationId}`);
    });
    socket.on('leave_conversation', (conversationId: string) => {
      if (typeof conversationId !== 'string') return;
      socket.leave(`conversation:${conversationId}`);
    });
  });
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function publishToConversation(conversationId: string, event: DomainEvent): void {
  io?.to(`conversation:${conversationId}`).emit('domain_event', event);
}

/** Emit a named Socket.io event to a conversation room (e.g. message.token, agent.unavailable). */
export function emitToConversation(
  conversationId: string,
  eventName: string,
  payload: unknown,
): void {
  io?.to(`conversation:${conversationId}`).emit(eventName, payload);
}

export function publishToUser(userId: string, event: DomainEvent): void {
  io?.to(`user:${userId}`).emit('domain_event', event);
}
