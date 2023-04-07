const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
const server = http.createServer();

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const createDefaultGrid = (width, height) => {
  const defaultColor = "#E4E8E6";
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(defaultColor));
};

const storedColors = createDefaultGrid(20, 20);

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("paint", (data) => {
    console.log("painted");
    storedColors[data.y] = storedColors[data.y] || [];
    storedColors[data.y][data.x] = data.color;

    // Broadcast the paint event to all other clients
    socket.broadcast.emit("paint", data);
  });

  socket.emit("init", storedColors);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
