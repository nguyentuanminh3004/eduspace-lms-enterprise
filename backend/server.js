require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const Enrollment = require('./models/Enrollment');
const apiRoutes = require('./routes/apiRoutes');
const initClassroomSocket = require('./socket/classroomSocket');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const server = http.createServer(app);

// 1. CORS & SOCKET.IO
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('KhĂ´ng Ä‘Æ°á»£c phĂ©p truy cáº­p tá»« nguá»“n (CORS) nĂ y.'));
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });
app.set('io', io);
initClassroomSocket(io);

app.use(cors(corsOptions));

// 2. SECURITY HEADERS & BODY PARSERS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Chá»‘ng NoSQL Operator Injection ($, .)
const sanitizeObject = (target) => {
  if (!target || typeof target !== 'object') return;
  if (Array.isArray(target)) {
    target.forEach(sanitizeObject);
    return;
  }
  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      sanitizeObject(target[key]);
    }
  }
};

app.use((req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  next();
});

// 3. RATE LIMITING
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'QuĂ¡ nhiá»u yĂªu cáº§u tá»« IP nĂ y, vui lĂ²ng thá»­ láº¡i sau 15 phĂºt.' },
});

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Thao tĂ¡c xĂ¡c thá»±c quĂ¡ nhiá»u láº§n, vui lĂ²ng thá»­ láº¡i sau 15 phĂºt.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authSensitiveLimiter);
app.use('/api/auth/change-password', authSensitiveLimiter);
app.use('/api/auth/avatar', authSensitiveLimiter);

// 4. STATIC UPLOADS (CHá»NG STORED XSS QUA FILE Táº¢I LĂN)
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const ext = path.extname(filePath).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

// 5. HEALTH & API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api', apiRoutes);

// 6. 404 & CENTRAL ERROR HANDLER
app.use('/api', (req, res) => {
  res.status(404).json({ message: `KhĂ´ng tĂ¬m tháº¥y Ä‘Æ°á»ng dáº«n API: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Server Error]:', err.stack || err);
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Lá»—i táº£i tá»‡p lĂªn: ${err.message}` });
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Dá»¯ liá»‡u Ä‘Ă£ tá»“n táº¡i trong há»‡ thá»‘ng.' });
  }
  res.status(err.statusCode || err.status || 500).json({
    message: err.message || 'Lá»—i mĂ¡y chá»§ ná»™i bá»™.',
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await Enrollment.cleanLegacyIndexes();
      server.listen(PORT, () => {
        console.log(`[Server] EduSpace Enterprise LMS running on port ${PORT}`);
      });
    } catch (error) {
      console.error('[Startup Error]:', error);
      process.exit(1);
    }
  })();
}

module.exports = { app, server };

