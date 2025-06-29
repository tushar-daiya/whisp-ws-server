import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { RoomManager } from "./modules/RoomManager.js";
import { SignalingHandler } from "./modules/SignalingHandler.js";
import { SERVER_CONFIG, SOCKET_EVENTS } from "./constants/index.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: SERVER_CONFIG.FRONTEND_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: SERVER_CONFIG.FRONTEND_ORIGINS,
    credentials: true,
  })
);
app.use(express.json());

// Initialize modules
const roomManager = new RoomManager();
const signalingHandler = new SignalingHandler(io, roomManager);

// API Routes
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Create meeting endpoint
app.post("/api/create-meeting", (req, res) => {
  try {
    // Generate a unique meeting ID
    const meetingId = uuidv4().substring(0, 8).toUpperCase();

    res.json({
      meetingId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({
      error: "Failed to create meeting",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/stats", (req, res) => {
  const stats = signalingHandler.getStats();
  res.json({
    ...stats,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/rooms", (req, res) => {
  const rooms = roomManager.getAllRooms();
  res.json({ rooms, count: rooms.length });
});

// Socket.IO connection handling
io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
  console.log("🔌 New socket connection established. Socket ID:", socket.id);
  signalingHandler.handleConnection(socket);

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log("❌ Socket disconnected. Socket ID:", socket.id);
    signalingHandler.handleDisconnection(socket);
  });
  socket.on("start-recording", (data) => {
    const { roomId,takeId } = data;
    const scheduledTime = Date.now() + (1000 * 5);

    socket.to(roomId).emit("start-recording", {
      scheduledTime,
      takeId
    });
  });
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  server.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  server.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
});

// Start server
server.listen(SERVER_CONFIG.PORT, () => {
  console.log(
    `🚀 WebRTC Signaling Server running on port ${SERVER_CONFIG.PORT}`
  );
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(
    `🌐 Allowed origins: ${SERVER_CONFIG.FRONTEND_ORIGINS.join(", ")}`
  );
  console.log(
    `📊 Health check available at http://localhost:${SERVER_CONFIG.PORT}/health`
  );
  console.log(
    `📈 Stats available at http://localhost:${SERVER_CONFIG.PORT}/stats`
  );
});
