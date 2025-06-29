// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3001,
  FRONTEND_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://compilo.xyz'
  ],
};

// Socket events
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Room management
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_CREATED: 'room-created',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  JOIN_ERROR: 'join-error',
  
  // WebRTC signaling
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  
  // Media
  MEDIA_STATE_CHANGE: 'media-state-change',
  END_CALL: 'end-call',
  CALL_ENDED: 'call-ended',
};

// Room configuration
export const ROOM_CONFIG = {
  MAX_USERS_DEFAULT: 2,
  CLEANUP_TIMEOUT: 30000, // 30 seconds
};

// Error messages
export const ERROR_MESSAGES = {
  ROOM_FULL: 'Room is full',
  ROOM_NOT_FOUND: 'Room not found',
  INVALID_ROOM_ID: 'Invalid room ID',
  USER_NOT_FOUND: 'User not found',
};
