// socket.js
// ==========================================================================
// THE APP'S REAL-TIME CONNECTION TO THE SERVER (MULTIPLAYER)
// ==========================================================================
//
// Multiplayer needs a way to talk to the server that stays open all the time
// (so the server can push "the reveal!" or "player left!" to us at any
// moment instead of us having to ask). That always-open connection is a
// WebSocket, and Socket.io manages it for us.
//
// Compared to api.js (which fetches questions over plain HTTP), this file is
// the LIVE channel used only by multiplayer. It reuses the same BASE_URL so
// if the server's address changes, you still only edit it in ONE place.
//
// We create the connection lazily — the socket is only made the first time
// someone opens the multiplayer screen, not when the app loads.
// ==========================================================================

import { io } from "socket.io-client";
import { BASE_URL } from "./api.js";

let socket = null; // remember the one connection so we don't make duplicates

/**
 * Get the shared socket connection, creating it the first time it's needed.
 * @returns {import("socket.io-client").Socket}
 */
export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, {
      // Try the fast WebSocket transport first, fall back to polling if needed.
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/**
 * Close the connection (called when the player leaves multiplayer).
 * Closing it tells the server we left, so it can remove us from the room.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null; // next getSocket() call will make a fresh connection
  }
}