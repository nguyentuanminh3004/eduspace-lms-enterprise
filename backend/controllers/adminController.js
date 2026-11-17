const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const LiveSession = require('../models/LiveSession');
const AuditLog = require('../models/AuditLog');

const logAdminAction = async (req, action, targetType, targetId, details, severity = 'info') => {
  try {
    await AuditLog.create({
      actor: req.user._id,
      action,
      targetType,
      targetId: String(targetId || ''),
      details,
      severity,
      ipAddress: req.ip || '',
    });
  } catch (err) {
    console.error('AuditLog Error:', err.message);
  }
};

// ==================== SYSTEM STATS ====================
exports.getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      lockedUsers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalAssignments,
      totalQuizzes,
      activeLiveSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ isActive: false }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'published' }),
      Enrollment.countDocuments(),
      Assignment.countDocuments(),
      Quiz.countDocuments(),
      LiveSession.countDocuments({ status: 'live' }),
    ]);

    const recentLogs = await AuditLog.find()
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(15);

    res.json({
      overview: {
        totalUsers,
        totalStudents,
        totalTeachers,
        lockedUsers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalAssignments,
        totalQuizzes,
        activeLiveSessions,
      },
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== USER PROVISIONING, CSV IMPORT & FULL EDIT ====================
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.createUserByAdmin = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      department,
      studentCode,
      phone,
      isActive,
      mustChangePassword,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Họ tên, email và mật khẩu khởi tạo là bắt buộc.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống.' });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
      department: department || 'Khoa Công Nghệ Thông Tin',
      studentCode: studentCode || '',
      phone: phone || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      mustChangePassword: mustChangePassword !== undefined ? Boolean(mustChangePassword) : true,
    });

    await logAdminAction(
      req,
      'PROVISION_USER',
      'User',
      user._id,
      `Admin cấp phát tài khoản: ${user.fullName} (${user.email}) - Vai trò: ${user.role}`,
      'info'
    );

    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
};

// NHẬP DANH SÁCH NGƯỜI DÙNG HÀNG LOẠT QUA CSV (TÍNH NĂNG ĐẶC TRƯNG V4)
exports.bulkImportUsersCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng tải lên tệp CSV danh sách người dùng.' });
    }

    const fs = require('fs');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const row of records) {
      const email = (row.email || '').toLowerCase().trim();
      const fullName = (row.fullName || row.name || '').trim();
      const password = (row.password || '').trim();

      if (!email || !fullName || password.length < 6) {
        skippedCount++;
        errors.push(`Dòng thiếu thông tin hoặc mật khẩu < 6 ký tự: ${email || 'N/A'}`);
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        skippedCount++;
        errors.push(`Email đã tồn tại: ${email}`);
        continue;
      }

      await User.create({
        fullName,
        email,
        password,
        role: ['student', 'teacher', 'admin'].includes(row.role) ? row.role : 'student',
        studentCode: row.studentCode || '',
        department: row.department || 'Khoa Công Nghệ Thông Tin',
        mustChangePassword: true,
      });
      createdCount++;
    }

    await logAdminAction(
      req,
      'BULK_IMPORT_CSV',
      'User',
      'CSV_BATCH',
      `Nhập hàng loạt từ CSV: Thành công ${createdCount}, Bỏ qua ${skippedCount}`,
      'warning'
    );

    res.json({
      message: `Hoàn tất nhập dữ liệu CSV: ${createdCount} tài khoản mới, ${skippedCount} bỏ qua.`,
      createdCount,
      skippedCount,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
};

// CHỈNH SỬA ĐẦY ĐỦ NGƯỜI DÙNG CHO ADMIN
exports.updateUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const {
      fullName,
      email,
      role,
      department,
      studentCode,
      phone,
      bio,
      isActive,
      mustChangePassword,
      newPassword,
    } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailTaken) {
        return res.status(400).json({ message: 'Email mới đã được tài khoản khác sử dụng.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (role !== undefined && ['student', 'teacher', 'admin'].includes(role)) user.role = role;
    if (department !== undefined) user.department = department;
    if (studentCode !== undefined) user.studentCode = studentCode;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (mustChangePassword !== undefined) user.mustChangePassword = Boolean(mustChangePassword);

    if (newPassword && newPassword.trim().length >= 6) {
      user.password = newPassword.trim();
    }

    const updated = await user.save();

    await logAdminAction(
      req,
      'UPDATE_USER',
      'User',
      updated._id,
      `Chỉnh sửa tài khoản: ${updated.fullName} (${updated.email}) | Role: ${updated.role} | Active: ${updated.isActive}`,
      'warning'
    );

    const safeUser = updated.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
};

exports.deleteUserByAdmin = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản quản trị đang sử dụng.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    await user.deleteOne();
    await logAdminAction(
      req,
      'DELETE_USER',
      'User',
      req.params.id,
      `Xóa vĩnh viễn tài khoản: ${user.fullName} (${user.email})`,
      'critical'
    );
    res.json({ message: 'Đã xóa người dùng khỏi hệ thống.' });
  } catch (error) {
    next(error);
  }
};

// ==================== COURSE MANAGEMENT & FULL EDIT FOR ADMIN ====================
exports.getAllCoursesAdmin = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate('teacher', 'fullName email department')
      .populate('category', 'name color')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

exports.updateCourseByAdmin = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    const {
      title,
      code,
      description,
      category,
      teacher,
      level,
      status,
      isFeatured,
      maxStudents,
      enrollmentKey,
    } = req.body;

    if (code && code.toUpperCase().trim() !== course.code) {
      const codeExists = await Course.findOne({ code: code.toUpperCase().trim() });
      if (codeExists) {
        return res.status(400).json({ message: 'Mã học phần đã tồn tại.' });
      }
      course.code = code.toUpperCase().trim();
    }

    if (title !== undefined) course.title = title.trim();
    if (description !== undefined) course.description = description;
    if (category !== undefined) course.category = category || null;
    if (teacher !== undefined) course.teacher = teacher;
    if (level !== undefined) course.level = level;
    if (status !== undefined) course.status = status;
    if (isFeatured !== undefined) course.isFeatured = Boolean(isFeatured);
    if (maxStudents !== undefined) course.maxStudents = Number(maxStudents);
    if (enrollmentKey !== undefined) course.enrollmentKey = enrollmentKey;

    const updated = await course.save();
    const populated = await Course.findById(updated._id)
      .populate('teacher', 'fullName email department')
      .populate('category', 'name color');

    await logAdminAction(
      req,
      'UPDATE_COURSE',
      'Course',
      course._id,
      `Chỉnh sửa học phần [${course.code}] ${course.title} | Trạng thái: ${course.status}`,
      'info'
    );

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

exports.deleteCourseByAdmin = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    await course.deleteOne();
    await Enrollment.deleteMany({ course: req.params.id });

    await logAdminAction(
      req,
      'DELETE_COURSE',
      'Course',
      req.params.id,
      `Xóa học phần [${course.code}] ${course.title}`,
      'critical'
    );
    res.json({ message: 'Đã xóa học phần.' });
  } catch (error) {
    next(error);
  }
};

// ==================== CATEGORY CRUD ====================
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const category = await Category.create({ name, slug, description, color });
    await logAdminAction(req, 'CREATE_CATEGORY', 'Category', category._id, `Tạo danh mục: ${name}`);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });

    const { name, description, color, isActive } = req.body;
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    const updated = await category.save();
    await logAdminAction(req, 'UPDATE_CATEGORY', 'Category', category._id, `Cập nhật danh mục: ${category.name}`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(150);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};
