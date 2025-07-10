const express = require("express");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const managerRoutes = require("./routes/manager");
const kriminalRoutes = require("./routes/kriminal");
const chatbotRoutes = require("./routes/chatbot");
const publicRoutes = require("./routes/public");
const publicAiRoutes = require("./routes/public-ai");
require("dotenv").config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:3000", "https://crimewatch-psi.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secrettoken",
    resave: false,
    saveUninitialized: false,
    name: "sessionId",
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    },
  })
);

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/kriminal", kriminalRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/public-ai", publicAiRoutes);

app.get("/api/session", (req, res) => {
  if (req.session.user) {
    res.json({
      isAuthenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({
      isAuthenticated: false,
    });
  }
});

const port = process.env.PORT || 8000;
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "crimewatch",
  port: process.env.MYSQLPORT || 3306,
};

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
