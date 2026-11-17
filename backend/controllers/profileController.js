const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sanitizeText } = require('../utils/securityHelper');

// PUT /api/auth/profile - Chỉ cho phép cập nhật fullName, phone, bio (chống Mass Assignment)
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, bio } = req.body;
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ message: 'Họ và tên phải có ít nhất 2 ký tự.' });
    }

    const user = await User.findById(req.user._id);
    user.fullName = sanitizeText(fullName);
    if (typeof phone === 'string') user.phone = sanitizeText(phone).slice(0, 20);
    if (typeof bio === 'string') user.bio = sanitizeText(bio).slice(0, 500);
    await user.save();

    await AuditLog.create({
      actor: user._id,
      action: 'UPDATE_PROFILE',
      targetType: 'User',
      targetId: String(user._id),
      details: 'Cập nhật thông tin hồ sơ cá nhân',
      severity: 'info',
      ipAddress: req.ip || '',
    }).catch(() => {});

    res.json({ message: 'Cập nhật hồ sơ thành công.', user });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/avatar - Upload & xóa file avatar cũ tránh rác ổ cứng
exports.uploadUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp ảnh đại diện.' });
    }

    const user = await User.findById(req.user._id);
    const oldAvatar = user.avatar;
    const newAvatarUrl = `/uploads/avatars/${req.file.filename}`;

    user.avatar = newAvatarUrl;
    await user.save();

    if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', oldAvatar);
      await fs.promises.unlink(oldPath).catch(() => {});
    }

    await AuditLog.create({
      actor: user._id,
      action: 'UPDATE_AVATAR',
      targetType: 'User',
      targetId: String(user._id),
      details: 'Thay đổi ảnh đại diện (đã xác thực Magic Bytes)',
      severity: 'info',
      ipAddress: req.ip || '',
    }).catch(() => {});

    res.json({ message: 'Cập nhật ảnh đại diện thành công.', avatar: newAvatarUrl, user });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/activity-logs - 15 nhật ký hoạt động gần nhất của chính user
exports.getMyActivityLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ actor: req.user._id }).sort({ createdAt: -1 }).limit(15);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};
