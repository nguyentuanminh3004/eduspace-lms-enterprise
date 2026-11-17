const jwt = require('jsonwebtoken');
const User = require('../models/User');

const initClassroomSocket = (io) => {
  const roomUsers = new Map();

  // Xác thực JWT ngay khi kết nối Socket.IO — chống giả mạo danh tính & nghe lén
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Yêu cầu xác thực token Socket.IO.'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const user = await User.findById(decoded.id).select('_id fullName role studentCode isActive');
      if (!user || !user.isActive) {
        return next(new Error('Tài khoản không hợp lệ.'));
      }
      socket.user = user;
      next();
    } catch {
      next(new Error('Phiên Socket.IO hết hạn hoặc không hợp lệ.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomCode }) => {
      if (!roomCode) return;
      socket.join(roomCode);
      if (!roomUsers.has(roomCode)) {
        roomUsers.set(roomCode, new Map());
      }
      const verifiedUser = {
        _id: socket.user._id,
        fullName: socket.user.fullName,
        role: socket.user.role,
      };
      roomUsers.get(roomCode).set(socket.id, verifiedUser);

      io.to(roomCode).emit('room-participants', Array.from(roomUsers.get(roomCode).values()));
      socket.to(roomCode).emit('room-message', {
        system: true,
        text: `${verifiedUser.fullName} đã tham gia phòng học.`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('send-room-message', ({ roomCode, text }) => {
      if (!roomCode || !text || typeof text !== 'string') return;
      const cleanText = text.replace(/<[^>]*>?/gm, '').slice(0, 1000).trim();
      if (!cleanText) return;

      io.to(roomCode).emit('room-message', {
        system: false,
        sender: {
          _id: socket.user._id,
          fullName: socket.user.fullName,
          role: socket.user.role,
        },
        text: cleanText,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('proctoring-alert', ({ courseId, quizTitle, violationType, count }) => {
      if (!courseId) return;
      io.emit(`proctoring-course-${courseId}`, {
        quizTitle: String(quizTitle || '').slice(0, 150),
        student: {
          fullName: socket.user.fullName,
          studentCode: socket.user.studentCode,
        },
        violationType: String(violationType || '').slice(0, 200),
        count: Number(count) || 1,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      roomUsers.forEach((usersMap, roomCode) => {
        if (usersMap.has(socket.id)) {
          const leftUser = usersMap.get(socket.id);
          usersMap.delete(socket.id);
          io.to(roomCode).emit('room-participants', Array.from(usersMap.values()));
          io.to(roomCode).emit('room-message', {
            system: true,
            text: `${leftUser.fullName} đã rời phòng học.`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  });
};

module.exports = initClassroomSocket;
