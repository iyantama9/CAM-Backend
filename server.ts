require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const port = process.env.PORT || 3001;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
};

for (const key in dbConfig) {
  if (!dbConfig[key]) {
    console.error(`Error: Environment variable ${key} is not defined.`);
    process.exit(1);
  }
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:3000",
          "http://localhost:5173",
          "https://cahapikmessenger.up.railway.app",
        ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error("!!! Gagal terhubung ke database:", err);
    process.exit(1);
  }
  console.log(">>> Terhubung ke database MySQL");
  createTables();
});

const createTables = () => {
  const usersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
  db.query(usersTableQuery, (err) => {
    if (err) console.error("!!! Gagal membuat tabel users:", err);
    else console.log(">>> Tabel users OK");
  });

  const messagesTableQuery = `
        CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            username VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
  db.query(messagesTableQuery, (err) => {
    if (err) {
      console.error("!!! Gagal membuat tabel messages:", err);
    } else {
      console.log(">>> Tabel messages OK");

      const checkIndexQuery = `
                SELECT COUNT(1) as index_exists
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                  AND table_name = 'messages'
                  AND index_name = 'idx_timestamp';
            `;

      db.query(checkIndexQuery, (checkErr, results) => {
        if (checkErr) {
          console.error(
            "!!! Gagal memeriksa keberadaan index timestamp:",
            checkErr
          );
          return;
        }

        const indexExists = results[0].index_exists;

        if (indexExists === 0) {
          const createIndexQuery =
            "CREATE INDEX idx_timestamp ON messages (timestamp)";
          db.query(createIndexQuery, (createErr) => {
            if (createErr) {
              console.error(
                "!!! Gagal menambahkan index timestamp:",
                createErr
              );
            } else {
              console.log(">>> Index timestamp berhasil ditambahkan");
            }
          });
        } else {
          console.log(">>> Index timestamp sudah ada");
        }
      });
    }
  });
};

app.post("/register", async (req, res) => {
  const { username, email, password, authCode } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, dan password harus diisi" });
  }
  if (authCode !== process.env.AUTH_CODE) {
    return res.status(403).json({ message: "Kode otentikasi salah" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.query(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [userId, username, email, hashedPassword],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(409)
              .json({ message: "Username atau email sudah digunakan" });
          }
          console.error("Gagal menyimpan user:", err);
          return res
            .status(500)
            .json({ message: "Gagal mendaftar (Server Error)" });
        }
        console.log(`User baru terdaftar: ${username} (ID: ${userId})`);
        res.status(201).json({
          message: "Pendaftaran berhasil",
          userId: userId,
          username: username,
        });
      }
    );
  } catch (error) {
    console.error("Error saat hashing password:", error);
    res.status(500).json({ message: "Gagal mendaftar (Server Error)" });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username dan password harus diisi" });
  }

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error("Gagal mencari user:", err);
        return res.status(500).json({ message: "Gagal login (Server Error)" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Username tidak ditemukan" });
      }

      const user = results[0];
      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          console.log(`User login berhasil: ${user.username} (ID: ${user.id})`);
          res.status(200).json({
            message: "Login berhasil",
            userId: user.id,
            username: user.username,
          });
        } else {
          res.status(401).json({ message: "Password salah" });
        }
      } catch (compareError) {
        console.error("Error saat membandingkan password:", compareError);
        res.status(500).json({ message: "Gagal login (Server Error)" });
      }
    }
  );
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : [
          "http://localhost:3000",
          "http://localhost:5173",
          "https://cahapikmessenger.up.railway.app",
        ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`>>> User terhubung: ${socket.id}`);

  socket.on("joinRoom", ({ userId }) => {
    if (!userId) {
      console.warn(
        `Attempt to join room with invalid userId from socket ${socket.id}`
      );
      return;
    }

    userSockets.set(userId, socket.id);
    socket.join(userId);
    console.log(
      `    User ID ${userId} (Socket ${socket.id}) bergabung ke room ${userId}`
    );

    db.query(
      "SELECT id, user_id, username, text, timestamp FROM messages ORDER BY timestamp DESC",
      (err, messages) => {
        if (err) {
          console.error(
            `!!! Gagal mengambil pesan awal untuk user ${userId}:`,
            err
          );
          socket.emit("serverError", "Gagal memuat riwayat pesan.");
        } else {
          const sortedMessages = messages.reverse();
          console.log(
            ` Mengirim ${sortedMessages.length} pesan awal ke user ${userId} (Socket ${socket.id})`
          );
          socket.emit("initialMessages", sortedMessages);
        }
      }
    );
  });

  socket.on("leaveRoom", ({ userId }) => {
    if (!userId) {
      console.warn(
        `Attempt to leave room with invalid userId from socket ${socket.id}`
      );
      return;
    }
    socket.leave(userId);
    console.log(
      `    User ID ${userId} (Socket ${socket.id}) meninggalkan room ${userId}`
    );
    userSockets.delete(userId);
  });

  socket.on("sendMessage", (messageData, ack) => {
    const { userId, username, text } = messageData;

    if (!userId || !username || !text || text.trim() === "") {
      console.warn("Menerima data pesan tidak valid:", messageData);
      if (typeof ack === "function") {
        ack({ success: false, error: "Data pesan tidak lengkap atau kosong." });
      }
      return;
    }

    const messageId = uuidv4();
    const timestampMs = Date.now();
    const newMessage = {
      id: messageId,
      userId: userId,
      username: username,
      text: text.trim(),
      timestamp: timestampMs,
    };

    db.query(
      "INSERT INTO messages (id, user_id, username, text, timestamp) VALUES (?, ?, ?, ?, ?)",
      [
        newMessage.id,
        newMessage.userId,
        newMessage.username,
        newMessage.text,
        timestampMs,
      ],
      (err, result) => {
        if (err) {
          console.error("!!! Gagal menyimpan pesan ke DB:", err);
          if (typeof ack === "function") {
            ack({ success: false, error: "Gagal menyimpan pesan di server." });
          }
        } else {
          console.log(`    Pesan disimpan ke DB (ID: ${newMessage.id})`);
          io.emit("message", newMessage);
          console.log(`    Pesan di-broadcast ke semua klien:`, newMessage);
          if (typeof ack === "function") {
            ack({ success: true, message: newMessage });
          }
        }
      }
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(`<<< User terputus: ${socket.id}, Alasan: ${reason}`);
    userSockets.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(
          `  Socket ${socket.id} dihapus dari userSockets (User ID: ${userId})`
        );
      }
    });
  });
});

server.listen(port, () => {
  console.log(`>>> Server berjalan di http://localhost:${port}`);
});
