import { generateRoomId, getOrCreateRoom, getRoom } from "../services/websocketService.js";
import { log } from "../utils/logger.js";

export function createRoom(req, res) {
  const roomId = generateRoomId();
  const room = getOrCreateRoom(roomId);
  log(`New room created: ${roomId}`, "room");
  res.json({ roomId: room.id });
}

export function getRoomInfo(req, res) {
  const { roomId } = req.params;
  const room = getRoom(roomId);
  
  if (room) {
    res.json({ 
      roomId: room.id, 
      userCount: room.users.size,
      pageCount: room.pages.length 
    });
  } else {
    res.json({ 
      roomId, 
      userCount: 0,
      pageCount: 0,
      isNew: true 
    });
  }
}
