import { WebSocketServer, WebSocket } from "ws";
import { log } from "../utils/logger.js";
import crypto from "crypto";

const rooms = new Map();

const COLORS = [
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#EC4899",
  "#F97316",
  "#06B6D4",
  "#6366F1",
  "#F43F5E",
];

export function generateRoomId() {
  return crypto.randomBytes(6).toString('hex');
}

export function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      pages: [{ id: "page-1", elements: [] }],
      currentPageIndex: 0,
      users: new Map(),
      createdAt: new Date(),
    };
    rooms.set(roomId, room);
    log(`Room ${roomId} created`, "room");
  }
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function cleanupEmptyRooms() {
  const now = Date.now();
  rooms.forEach((room, roomId) => {
    if (room.users.size === 0 && now - room.createdAt.getTime() > 30 * 60 * 1000) {
      rooms.delete(roomId);
      log(`Room ${roomId} cleaned up (empty for 30+ minutes)`, "room");
    }
  });
}

function getColorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function generateUserId() {
  return Math.random().toString(36).substring(2, 15);
}

function broadcastUsersInRoom(room) {
  const users = Array.from(room.users.values()).map(({ id, username, color }) => ({
    id,
    username,
    color,
  }));

  const message = JSON.stringify({
    type: "users",
    users,
  });

  room.users.forEach((user) => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  });
}

function broadcastToOthersInRoom(room, senderId, message) {
  const messageStr = JSON.stringify(message);
  room.users.forEach((user) => {
    if (user.id !== senderId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(messageStr);
    }
  });
}

function broadcastToAllInRoom(room, message) {
  const messageStr = JSON.stringify(message);
  room.users.forEach((user) => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(messageStr);
    }
  });
}

export function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let userId = null;
    let currentRoom = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message, { userId, currentRoom }, (newState) => {
          userId = newState.userId;
          currentRoom = newState.currentRoom;
        });
      } catch (error) {
        log(`WebSocket message error: ${error.message}`, "websocket");
      }
    });

    ws.on("close", () => {
      if (userId && currentRoom) {
        currentRoom.users.delete(userId);
        log(`User ${userId} disconnected from room ${currentRoom.id}. Room users: ${currentRoom.users.size}`, "websocket");
        broadcastUsersInRoom(currentRoom);
      }
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error.message}`, "websocket");
    });
  });

  setInterval(cleanupEmptyRooms, 10 * 60 * 1000);

  return wss;
}

function handleWebSocketMessage(ws, message, state, setState) {
  let { userId, currentRoom } = state;

  if (message.type === "join") {
    userId = generateUserId();
    const username = message.username || "Anonymous";
    const color = getColorFromName(username);
    const roomId = message.roomId || generateRoomId();
    
    currentRoom = getOrCreateRoom(roomId);
    
    const user = {
      id: userId,
      username,
      color,
      ws,
      roomId,
    };
    
    currentRoom.users.set(userId, user);
    setState({ userId, currentRoom });

    log(`User ${username} (${userId}) joined room ${roomId}. Room users: ${currentRoom.users.size}`, "websocket");

    ws.send(JSON.stringify({
      type: "welcome",
      userId,
      username,
      color,
      roomId,
    }));

    ws.send(JSON.stringify({
      type: "page:state",
      currentPage: currentRoom.currentPageIndex,
      totalPages: currentRoom.pages.length,
      elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
    }));

    broadcastUsersInRoom(currentRoom);
  }

  if (message.type === "element:create" && userId && currentRoom) {
    const element = {
      ...message.element,
      createdBy: userId,
    };
    currentRoom.pages[currentRoom.currentPageIndex].elements.push(element);
    
    broadcastToOthersInRoom(currentRoom, userId, {
      type: "element:create",
      element,
    });
    
    log(`Element created by user ${userId} in room ${currentRoom.id}`, "websocket");
  }

  if (message.type === "board:clear" && userId && currentRoom) {
    currentRoom.pages[currentRoom.currentPageIndex].elements.length = 0;
    
    broadcastToAllInRoom(currentRoom, {
      type: "board:clear",
    });
    
    log(`Board cleared by user ${userId} in room ${currentRoom.id}`, "websocket");
  }

  if (message.type === "board:undo" && userId && currentRoom) {
    const currentElements = currentRoom.pages[currentRoom.currentPageIndex].elements;
    for (let i = currentElements.length - 1; i >= 0; i--) {
      if (currentElements[i].createdBy === userId) {
        currentElements.splice(i, 1);
        broadcastToAllInRoom(currentRoom, {
          type: "page:state",
          currentPage: currentRoom.currentPageIndex,
          totalPages: currentRoom.pages.length,
          elements: currentElements,
        });
        log(`Undo by user ${userId} in room ${currentRoom.id}`, "websocket");
        break;
      }
    }
  }

  if (message.type === "page:add" && userId && currentRoom) {
    const newPageId = `page-${currentRoom.pages.length + 1}`;
    currentRoom.pages.push({ id: newPageId, elements: [] });
    currentRoom.currentPageIndex = currentRoom.pages.length - 1;

    broadcastToAllInRoom(currentRoom, {
      type: "page:state",
      currentPage: currentRoom.currentPageIndex,
      totalPages: currentRoom.pages.length,
      elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
    });

    log(`Page added by user ${userId}. Total pages: ${currentRoom.pages.length}`, "websocket");
  }

  if (message.type === "page:navigate" && userId && currentRoom) {
    const pageIndex = message.pageIndex;
    if (pageIndex >= 0 && pageIndex < currentRoom.pages.length) {
      currentRoom.currentPageIndex = pageIndex;

      broadcastToAllInRoom(currentRoom, {
        type: "page:state",
        currentPage: currentRoom.currentPageIndex,
        totalPages: currentRoom.pages.length,
        elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
      });

      log(`Navigated to page ${pageIndex} by user ${userId}`, "websocket");
    }
  }

  if (message.type === "page:delete" && userId && currentRoom) {
    const pageIndex = message.pageIndex;
    if (currentRoom.pages.length > 1 && pageIndex >= 0 && pageIndex < currentRoom.pages.length) {
      currentRoom.pages.splice(pageIndex, 1);
      if (currentRoom.currentPageIndex >= currentRoom.pages.length) {
        currentRoom.currentPageIndex = currentRoom.pages.length - 1;
      }

      broadcastToAllInRoom(currentRoom, {
        type: "page:state",
        currentPage: currentRoom.currentPageIndex,
        totalPages: currentRoom.pages.length,
        elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
      });

      log(`Page ${pageIndex} deleted by user ${userId}. Total pages: ${currentRoom.pages.length}`, "websocket");
    }
  }

  if (message.type === "cursor:move" && userId && currentRoom) {
    broadcastToOthersInRoom(currentRoom, userId, {
      type: "cursor:move",
      userId,
      x: message.x,
      y: message.y,
    });
  }

  if (message.type === "page:getAll" && userId && currentRoom) {
    ws.send(JSON.stringify({
      type: "page:allPages",
      pages: currentRoom.pages.map(page => ({
        id: page.id,
        elements: page.elements,
        createdAt: page.createdAt || new Date().toISOString(),
      })),
    }));
    log(`All pages requested by user ${userId} in room ${currentRoom.id}`, "websocket");
  }

  if (message.type === "page:load" && userId && currentRoom) {
    if (message.pages && Array.isArray(message.pages)) {
      currentRoom.pages = message.pages.map((page, index) => ({
        id: page.id || `page-${index + 1}`,
        elements: page.elements || [],
        createdAt: page.createdAt || new Date().toISOString(),
      }));
      currentRoom.currentPageIndex = 0;

      broadcastToAllInRoom(currentRoom, {
        type: "page:state",
        currentPage: currentRoom.currentPageIndex,
        totalPages: currentRoom.pages.length,
        elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
      });

      log(`Pages loaded by user ${userId}. Total pages: ${currentRoom.pages.length}`, "websocket");
    }
  }

  if (message.type === "page:reset" && userId && currentRoom) {
    currentRoom.pages = [{ id: "page-1", elements: [], createdAt: new Date().toISOString() }];
    currentRoom.currentPageIndex = 0;

    broadcastToAllInRoom(currentRoom, {
      type: "page:state",
      currentPage: currentRoom.currentPageIndex,
      totalPages: currentRoom.pages.length,
      elements: currentRoom.pages[currentRoom.currentPageIndex].elements,
    });

    log(`Pages reset by user ${userId}`, "websocket");
  }
}
