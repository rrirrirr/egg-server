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
  const defaultColor = "#1e1e2e";
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(defaultColor));
};

const createRandomColoredEgg = (width, height) => {
  const colors = [
    "#FFB6C1",
    "#FFDAB9",
    "#E6E6FA",
    "#B0E0E6",
    "#F0E68C",
    "#FFC0CB",
    "#FFE4E1",
    "#D8BFD8",
    "#FFDEAD",
    "#C6E2FF",
    "#BFEFFF",
    "#F0FFF0",
  ];

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const outlineThickness = 1;

  const grid = Array(height)
    .fill(null)
    .map(() => Array(width).fill("transparent"));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceSquared = dx * dx + dy * dy;
      const outerRadius = (width * height) / 4;
      const innerRadius = outerRadius - outlineThickness;
      if (distanceSquared <= outerRadius && distanceSquared >= innerRadius) {
        // Diagonal stripes pattern
        const colorIndex = Math.floor((x + y) / 4) % colors.length;
        grid[y][x] = colors[colorIndex];
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceSquared = dx * dx + dy * dy;
      const outerRadius = (width * height) / 4;
      const innerRadius = outerRadius - outlineThickness;

      // Check if the position is within the egg shape
      if (distanceSquared <= outerRadius) {
        // Diagonal stripes pattern
        const colorIndex = Math.floor((x + y) / 4) % colors.length;
        grid[y][x] = colors[colorIndex];
      }
    }
  }
  return grid;
};

const storedColors = createRandomColoredEgg(20, 20);

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("paint", (data) => {
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
