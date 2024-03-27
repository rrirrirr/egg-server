const http = require("http");
const socketIo = require("socket.io");
const { Pool } = require("pg");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
const server = http.createServer();

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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

const createTableQuery = `
CREATE TABLE IF NOT EXISTS color_grid (
  id SERIAL PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL,
  UNIQUE(x, y)
);
`;

const populateWithEggIfEmpty = async () => {
  const { rowCount } = await pool.query("SELECT 1 FROM color_grid LIMIT 1;");

  if (rowCount === 0) {
    console.log("Populating the database with the egg pattern...");
    const eggPattern = createRandomColoredEgg(20, 20);

    const insertPromises = [];
    for (let y = 0; y < eggPattern.length; y++) {
      for (let x = 0; x < eggPattern[y].length; x++) {
        const color = eggPattern[y][x];
        const insertQuery = `INSERT INTO color_grid(x, y, color) VALUES($1, $2, $3);`;
        insertPromises.push(pool.query(insertQuery, [x, y, color]));
      }
    }

    // Wait for all inserts to complete
    await Promise.all(insertPromises);
    console.log("Egg pattern populated in the database.");
  }
};

// Initialize the table and possibly populate it with the egg pattern
pool
  .query(createTableQuery)
  .then(() => populateWithEggIfEmpty())
  .catch((e) => console.error(e.stack));

io.on("connection", (socket) => {
  console.log("New client connected");

  // Fetch stored colors from the database and send them to the client
  pool.query(
    "SELECT x, y, color FROM color_grid ORDER BY id ASC;",
    (error, results) => {
      if (error) {
        throw error;
      }
      socket.emit("init", results.rows);
    }
  );

  socket.on("paint", (data) => {
    const insertOrUpdateQuery = `
    INSERT INTO color_grid(x, y, color)
    VALUES($1, $2, $3)
    ON CONFLICT(x, y)
    DO UPDATE SET color = EXCLUDED.color;
    `;

    pool.query(
      insertOrUpdateQuery,
      [data.x, data.y, data.color],
      (error, results) => {
        if (error) {
          throw error;
        }
        // Broadcast the paint event to all other clients
        socket.broadcast.emit("paint", data);
      }
    );
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
