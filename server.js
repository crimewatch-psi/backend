const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const kriminalRoutes = require('./routes/kriminal');
const chatbotRoutes = require('./routes/chatbot');
require('dotenv').config();

const app = express();

app.use(express.json());

// Session middleware
app.use(session({
  secret: 'secrettoken', // bisa diganti
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 168 // 1 minggu
  }
}));

// Routing
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kriminal', kriminalRoutes);
app.use('/api/chatbot', chatbotRoutes);

// endpoint cek session
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({
      isAuthenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      isAuthenticated: false
    });
  }
});

app.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
});
