/**
 * One Socket.IO connection for the whole app (see backend/src/services/realtime.js
 * for the events). It signs in with the same token as the REST API and
 * reconnects by itself. Screens subscribe with `onSocket`; subscriptions live
 * in this module, so they keep working across reconnects and sign-ins.
 */
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from './client';

let socket: Socket | null = null;
let currentKey = '';
const listeners = new Map<string, Set<(data: any) => void>>();
const statusListeners = new Set<(connected: boolean) => void>();

const dispatch = (event: string, data: unknown) => listeners.get(event)?.forEach((h) => h(data));

export function connectSocket(token: string) {
  const key = `${getApiUrl()}|${token}`;
  if (socket && currentKey === key) return;
  disconnectSocket();
  currentKey = key;
  socket = io(getApiUrl(), {
    path: '/socket.io',
    auth: { token },
    // Websocket only: React Native's long-polling fallback is slow and flaky.
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 10000,
  });
  socket.onAny(dispatch);
  socket.on('connect', () => statusListeners.forEach((l) => l(true)));
  socket.on('disconnect', () => statusListeners.forEach((l) => l(false)));
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentKey = '';
  statusListeners.forEach((l) => l(false));
}

export const socketConnected = () => !!socket?.connected;

/** Subscribe to a server event; returns the unsubscribe function. */
export function onSocket<T = any>(event: string, handler: (data: T) => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

export function onSocketStatus(l: (connected: boolean) => void) {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

export function emitSocket(event: string, data?: unknown, ack?: (res: any) => void) {
  if (!socket?.connected) return;
  if (ack) socket.emit(event, data, ack);
  else socket.emit(event, data);
}
