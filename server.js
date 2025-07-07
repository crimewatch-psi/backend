const express = require("express");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const kriminalRoutes = require("./routes/kriminal");
const chatbotRoutes = require("./routes/chatbot");
require("dotenv").config();

const app = express();

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secrettoken",
    resave: false,
    saveUninitialized: false,
    name: "sessionId",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 168,
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-XSRF-TOKEN"],
    exposedHeaders: ["set-cookie"],
  })
);

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/kriminal", kriminalRoutes);
app.use("/api/chatbot", chatbotRoutes);

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

app.listen(8000, () => {
  console.log("Server berjalan di http://localhost:8000");
});
