import { SOCKET_EVENTS } from '../constants/index.js';

export class SignalingHandler {
  constructor(io, roomManager) {
    this.io = io;
    this.roomManager = roomManager;
    this.userSockets = new Map(); // userId -> socketId mapping
  }

  /**
   * Handle new socket connection
   * @param {Socket} socket - The socket instance
   */
  handleConnection(socket) {
    // Store socket reference
    this.userSockets.set(socket.id, socket);

    
    console.log(`🔌 User connected: ${socket.id}`);

    // Register all event handlers
    this._registerRoomEvents(socket);
    this._registerWebRTCEvents(socket);
    this._registerMediaEvents(socket);
  }

  /**
   * Handle socket disconnection
   * @param {Socket} socket - The socket instance
   */
  handleDisconnection(socket) {
    const roomId = this.roomManager.getUserRoom(socket.id);
    
    console.log(`🔌 Socket ${socket.id} disconnecting${roomId ? ` from room ${roomId}` : ' (not in any room)'}`);
    
    if (roomId) {
      const room = this.roomManager.leaveRoom(roomId, socket.id);
      
      // Notify remaining users
      socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
        userId: socket.id,
        roomId
      });

      console.log(`👋 Socket ${socket.id} left room ${roomId} - Remaining users: ${room ? room.users.length : 0}`);
    }

    this.userSockets.delete(socket.id);
    console.log(`✅ Socket ${socket.id} fully disconnected and cleaned up`);
  }

  /**
   * Register room management events
   * @private
   * @param {Socket} socket - The socket instance
   */
  _registerRoomEvents(socket) {
    // Handle room creation
    socket.on(SOCKET_EVENTS.CREATE_ROOM, (data) => {
      const { roomId } = data;
      
      console.log(`🎯 CREATE_ROOM request - Socket: ${socket.id}, Room: ${roomId}`);
      
      // Check if room already exists
      if (this.roomManager.roomExists(roomId)) {
        console.log(`🔄 Room ${roomId} already exists, joining socket ${socket.id} instead of creating`);
        
        // Room exists, try to join it instead of creating
        const result = this.roomManager.joinRoom(roomId, socket.id);
        
        if (result?.error) {
          console.log(`❌ Failed to join existing room ${roomId} for socket ${socket.id}: ${result.error}`);
          socket.emit(SOCKET_EVENTS.JOIN_ERROR, { error: result.error });
          return;
        }
        
        socket.join(roomId);
        
        // Notify all users in the room
        this.io.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          roomId,
          userId: socket.id,
          users: result.users
        });
        
        console.log(`✅ Socket ${socket.id} successfully joined existing room: ${roomId} (${result.users.length} users total)`);
      } else {
        console.log(`🆕 Creating new room ${roomId} for socket ${socket.id}`);
        
        // Room doesn't exist, create it
        const room = this.roomManager.createRoom(roomId, socket.id);
        
        socket.join(roomId);
        socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
          roomId: room.id,
          userId: socket.id,
          users: room.users
        });

        console.log(`✅ Room ${roomId} created successfully by socket ${socket.id} (${room.users.length} users total)`);
      }
    });

    // Handle room joining
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => {
      const { roomId } = data;
      
      console.log(`🎯 JOIN_ROOM request - Socket: ${socket.id}, Room: ${roomId}`);
      
      // Try to join existing room, or create if it doesn't exist
      let result = this.roomManager.joinRoom(roomId, socket.id);
      
      if (!result) {
        console.log(`🆕 Room ${roomId} doesn't exist, creating it for socket ${socket.id}`);
        
        // Room doesn't exist, create it
        result = this.roomManager.createRoom(roomId, socket.id);
        console.log(`✅ New room ${roomId} created for socket ${socket.id} (${result.users.length} users total)`);
      } else if (result?.error) {
        console.log(`❌ Failed to join room ${roomId} for socket ${socket.id}: ${result.error}`);
        socket.emit(SOCKET_EVENTS.JOIN_ERROR, { error: result.error });
        return;
      } else {
        console.log(`✅ Socket ${socket.id} successfully joined existing room ${roomId} (${result.users.length} users total)`);
      }

      socket.join(roomId);
      
      // Notify all users in the room
      this.io.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
        roomId,
        userId: socket.id,
        users: result.users
      });

      console.log(`� USER_JOINED event broadcasted to room ${roomId} - Socket: ${socket.id}, Total users: ${result.users.length}`);
    });
  }

  /**
   * Register WebRTC signaling events
   * @private
   * @param {Socket} socket - The socket instance
   */
  _registerWebRTCEvents(socket) {
    // Handle WebRTC offers
    socket.on(SOCKET_EVENTS.OFFER, (data) => {
      const { roomId, offer, targetUserId } = data;
      
      this._forwardSignalingMessage(socket, SOCKET_EVENTS.OFFER, {
        offer,
        fromUserId: socket.id
      }, roomId, targetUserId);

      console.log(`📞 Offer sent from ${socket.id} in room ${roomId}`);
    });

    // Handle WebRTC answers
    socket.on(SOCKET_EVENTS.ANSWER, (data) => {
      const { roomId, answer, targetUserId } = data;
      
      this._forwardSignalingMessage(socket, SOCKET_EVENTS.ANSWER, {
        answer,
        fromUserId: socket.id
      }, roomId, targetUserId);

      console.log(`📞 Answer sent from ${socket.id} in room ${roomId}`);
    });

    // Handle ICE candidates
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (data) => {
      const { roomId, candidate, targetUserId } = data;
      
      this._forwardSignalingMessage(socket, SOCKET_EVENTS.ICE_CANDIDATE, {
        candidate,
        fromUserId: socket.id
      }, roomId, targetUserId);

      console.log(`🧊 ICE candidate sent from ${socket.id} in room ${roomId}`);
    });
  }

  /**
   * Register media control events
   * @private
   * @param {Socket} socket - The socket instance
   */
  _registerMediaEvents(socket) {
    // Handle media state changes
    socket.on(SOCKET_EVENTS.MEDIA_STATE_CHANGE, (data) => {
      const { roomId, mediaState } = data;
      socket.to(roomId).emit(SOCKET_EVENTS.MEDIA_STATE_CHANGE, {
        userId: socket.id,
        mediaState
      });

      console.log(`🎥 Media state changed for ${socket.id}: ${JSON.stringify(mediaState)}`);
    });

    // Handle call end
    socket.on(SOCKET_EVENTS.END_CALL, (data) => {
      const { roomId } = data;
      socket.to(roomId).emit(SOCKET_EVENTS.CALL_ENDED, {
        userId: socket.id
      });

      console.log(`📞 Call ended by ${socket.id} in room ${roomId}`);
    });
  }

  /**
   * Forward signaling messages to appropriate recipients
   * @private
   * @param {Socket} socket - The sender socket
   * @param {string} event - The event name
   * @param {Object} data - The message data
   * @param {string} roomId - The room ID
   * @param {string} [targetUserId] - Optional target user ID
   */
  _forwardSignalingMessage(socket, event, data, roomId, targetUserId) {
    if (targetUserId) {
      // Direct peer-to-peer message
      socket.to(targetUserId).emit(event, data);
    } else {
      // Broadcast to room (excluding sender)
      socket.to(roomId).emit(event, data);
    }
  }

  /**
   * Get statistics about the signaling handler
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      connectedUsers: this.userSockets.size,
      totalRooms: this.roomManager.getRoomCount(),
      rooms: this.roomManager.getAllRooms()
    };
  }
}