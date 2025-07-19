const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const managerRoutes = require("./routes/manager");
const kriminalRoutes = require("./routes/kriminal");
const chatbotRoutes = require("./routes/chatbot");
const publicRoutes = require("./routes/public");

require("dotenv").config();

const app = express();

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "https://crimewatch-nine.vercel.app",
    ];

    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.log("📨 INCOMING REQUEST:", {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    authorization: req.headers.authorization ? "Bearer [TOKEN]" : "None",
    timestamp: new Date().toISOString(),
  });
  next();
});

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/kriminal", kriminalRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/public", publicRoutes);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
