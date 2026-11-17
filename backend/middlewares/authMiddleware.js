const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị đình chỉ.' });
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ message: 'Mật khẩu vừa được thay đổi. Vui lòng đăng nhập lại.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
  }
  next();
};

// Bảo vệ chống IDOR: Chỉ cho phép học viên đã được duyệt (active), giảng viên phụ trách hoặc Admin truy cập nội dung lớp
const requireCourseAccess = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.params.id || req.body.course || req.body.courseId;
    if (!courseId) return next();

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy học phần.' });
    }

    if (req.user.role === 'admin' || String(course.teacher) === String(req.user._id)) {
      req.course = course;
      return next();
    }

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'Bạn chưa được phê duyệt ghi danh vào học phần này.',
      });
    }

    req.course = course;
    req.enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, authorize, requireCourseAccess };
