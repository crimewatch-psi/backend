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
const SupabaseSessionStore = require("./lib/supabase-session-store");
require("dotenv").config();

const app = express();

app.use(express.json());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "https://crimewatch-psi.vercel.app",
      "https://crimewatch-bkpc2ynck-ameliazsabrinas-projects.vercel.app",
      "https://crimewatch-2ffzso28w-ameliazsabrinas-projects.vercel.app",
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

// Cookie tracking middleware - BEFORE session middleware
app.use((req, res, next) => {
  console.log("📨 INCOMING REQUEST:", {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers["user-agent"],
    cookies: req.headers.cookie,
    timestamp: new Date().toISOString(),
  });

  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === "set-cookie") {
      console.log("🍪 SETTING COOKIE:", {
        url: req.url,
        cookieHeader: value,
        timestamp: new Date().toISOString(),
      });
    }
    return originalSetHeader.call(this, name, value);
  };

  next();
});

// Configure session store based on environment
let sessionStore;
if (process.env.NODE_ENV === "production") {
  try {
    sessionStore = new SupabaseSessionStore({
      tableName: "sessions",
      ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    
    // Add error event handler
    sessionStore.on('error', (error) => {
      console.error('📦 Session store error:', error);
    });
    
    console.log("✅ Supabase session store initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Supabase session store:", error);
    console.log("🔄 Falling back to MemoryStore for now");
    sessionStore = undefined;
  }
} else {
  sessionStore = undefined; // Use default MemoryStore for development
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "sessionId",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/",
    },
  })
);

// Session tracking middleware - AFTER session middleware
app.use((req, res, next) => {
  console.log("🔐 SESSION MIDDLEWARE PROCESSED:", {
    url: req.url,
    sessionId: req.sessionID,
    hasUser: !!req.session.user,
    cookieReceived: !!req.headers.cookie,
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
app.use("/api/public-ai", publicAiRoutes);

app.get("/api/session", (req, res) => {
  console.log("🔍 SESSION CHECK DETAILED:", {
    sessionId: req.sessionID,
    hasSession: !!req.session.user,
    user: req.session.user,
    sessionData: req.session,
    cookies: {
      raw: req.headers.cookie,
      parsed: req.cookies,
      signed: req.signedCookies,
    },
    headers: {
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
      referer: req.headers.referer,
      host: req.headers.host,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      sessionSecret: process.env.SESSION_SECRET ? "SET" : "MISSING",
    },
    sessionStore: {
      exists: !!req.sessionStore,
      type: req.sessionStore ? req.sessionStore.constructor.name : "NONE",
    },
  });

  if (req.sessionStore && req.sessionID) {
    req.sessionStore.get(req.sessionID, (err, session) => {
      console.log("🗄️ SESSION STORE LOOKUP:", {
        sessionId: req.sessionID,
        error: err,
        sessionFound: !!session,
        sessionData: session,
      });
    });
  }

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

app.get("/api/debug/set-test-cookie", (req, res) => {
  console.log("🧪 SETTING TEST COOKIE");
  res.cookie("testCookie", "testValue", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60000, // 1 minute
  });
  res.json({ message: "Test cookie set" });
});

app.get("/api/debug/check-cookies", (req, res) => {
  console.log("🧪 CHECKING COOKIES:", {
    raw: req.headers.cookie,
    parsed: req.cookies,
    signed: req.signedCookies,
  });
  res.json({
    cookies: {
      raw: req.headers.cookie,
      parsed: req.cookies,
      signed: req.signedCookies,
    },
  });
});

app.get("/api/debug/cors", (req, res) => {
  console.log("🧪 CORS DEBUG:", {
    origin: req.headers.origin,
    method: req.method,
    headers: req.headers,
  });
  res.json({
    origin: req.headers.origin,
    corsAllowed: true,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check session store
app.get("/api/debug/session-store", (req, res) => {
  console.log("🧪 SESSION STORE DEBUG:", {
    hasSessionStore: !!sessionStore,
    storeType: sessionStore ? sessionStore.constructor.name : 'MemoryStore',
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
    supabaseKey: process.env.SUPABASE_ROLE_KEY ? 'SET' : 'MISSING'
  });
  
  res.json({
    sessionStore: {
      type: sessionStore ? sessionStore.constructor.name : 'MemoryStore',
      configured: !!sessionStore,
      environment: process.env.NODE_ENV
    },
    environment: {
      supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseKey: process.env.SUPABASE_ROLE_KEY ? 'SET' : 'MISSING',
      nodeEnv: process.env.NODE_ENV
    }
  });
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
