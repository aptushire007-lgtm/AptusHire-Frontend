import { io } from "socket.io-client";
import { baseURL } from "../api/client.js";

// Same normalized base as the REST client (scheme added, "/api" ensured), minus
// the trailing "/api" — socket.io connects to the origin.
const SOCKET_URL = baseURL.replace(/\/api\/?$/, "");

let socket = null;

export function connectSocket(token) {
  if (!token) return null;
  if (socket) {
    socket.disconnect();
  }
  // Polling-first, then transparently upgrade to WebSocket. More reliable behind
  // proxies/tunnels (e.g. VS Code dev tunnels), where a straight WS upgrade can be
  // dropped — avoids the noisy "WebSocket is closed before…" console error while
  // still using WS once the connection is clean.
  socket = io(SOCKET_URL, { auth: { token }, transports: ["polling", "websocket"] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
