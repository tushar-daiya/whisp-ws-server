import { ROOM_CONFIG, ERROR_MESSAGES } from '../constants/index.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Creates a new room with the given ID and adds the user to it
   * @param {string} roomId - The room ID
   * @param {string} userId - The user ID
   * @returns {Object} The created room
   */
  createRoom(roomId, userId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Set(),
        createdAt: new Date(),
        maxUsers: ROOM_CONFIG.MAX_USERS_DEFAULT,
      });
    }
    
    const room = this.rooms.get(roomId);
    room.users.add(userId);
    
    return this._sanitizeRoom(room);
  }

  /**
   * Adds a user to an existing room
   * @param {string} roomId - The room ID
   * @param {string} userId - The user ID
   * @returns {Object|null} The room object or error
   */
  joinRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    if (room.users.size >= room.maxUsers) {
      return { error: ERROR_MESSAGES.ROOM_FULL };
    }

    room.users.add(userId);
    return this._sanitizeRoom(room);
  }

  /**
   * Removes a user from a room
   * @param {string} roomId - The room ID
   * @param {string} userId - The user ID
   * @returns {Object|null} The updated room or null if room was deleted
   */
  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.users.delete(userId);
    
    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return this._sanitizeRoom(room);
  }

  /**
   * Gets all users in a room
   * @param {string} roomId - The room ID
   * @returns {Array} Array of user IDs
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users) : [];
  }

  /**
   * Finds the room a user is currently in
   * @param {string} userId - The user ID
   * @returns {string|null} The room ID or null
   */
  getUserRoom(userId) {
    for (const [roomId, room] of this.rooms) {
      if (room.users.has(userId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Gets room information
   * @param {string} roomId - The room ID
   * @returns {Object|null} The room info or null
   */
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    return room ? this._sanitizeRoom(room) : null;
  }

  /**
   * Gets information about all rooms
   * @returns {Array} Array of room info objects
   */
  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      userCount: room.users.size,
      maxUsers: room.maxUsers,
      createdAt: room.createdAt,
    }));
  }

  /**
   * Checks if a room exists
   * @param {string} roomId - The room ID
   * @returns {boolean} True if room exists
   */
  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Gets the total number of rooms
   * @returns {number} Number of active rooms
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Sanitizes room data for client consumption
   * @private
   * @param {Object} room - The room object
   * @returns {Object} Sanitized room data
   */
  _sanitizeRoom(room) {
    return {
      id: room.id,
      users: Array.from(room.users),
      userCount: room.users.size,
      maxUsers: room.maxUsers,
      createdAt: room.createdAt,
    };
  }
}