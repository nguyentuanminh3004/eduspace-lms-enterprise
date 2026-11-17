const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validatePasswordStrength } = require('../utils/securityHelper');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 phút

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRE || '8h',
  });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +failedLoginAttempts +lockUntil'
    );

    if (!user) {
      return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác.' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Phòng Đào tạo / Quản trị viên.',
      });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        await user.save({ validateBeforeSave: false });
        await AuditLog.create({
          actor: user._id,
          action: 'ACCOUNT_TEMP_LOCKED',
          targetType: 'Security',
          targetId: String(user._id),
          details: `Tạm khóa 15 phút do đăng nhập sai ${MAX_FAILED_ATTEMPTS} lần liên tiếp`,
          severity: 'critical',
          ipAddress: req.ip || '',
        }).catch(() => {});
        return res.status(423).json({
          message: 'Tài khoản bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.',
        });
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({
        message: `Thông tin đăng nhập không chính xác (Còn ${MAX_FAILED_ATTEMPTS - user.failedLoginAttempts} lần thử).`,
      });
    }

    // Đăng nhập thành công: reset bộ đếm lỗi
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actor: user._id,
      action: 'USER_LOGIN',
      targetType: 'Auth',
      targetId: String(user._id),
      details: `Đăng nhập hệ thống thành công (${user.role})`,
      severity: 'info',
      ipAddress: req.ip || '',
    }).catch(() => {});

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      studentCode: user.studentCode,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      mustChangePassword: user.mustChangePassword,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message: 'Mật khẩu mới phải dài tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới không được trùng mật khẩu hiện tại.' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    await AuditLog.create({
      actor: user._id,
      action: 'CHANGE_PASSWORD',
      targetType: 'Security',
      targetId: String(user._id),
      details: 'Người dùng tự cập nhật mật khẩu bảo mật và vô hiệu hóa phiên cũ',
      severity: 'info',
      ipAddress: req.ip || '',
    }).catch(() => {});

    const safeUser = await User.findById(user._id);
    res.json({
      message: 'Đổi mật khẩu thành công.',
      token: generateToken(user._id),
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
