const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const SystemSetting = require('../models/SystemSetting');
const { sanitizeText } = require('../utils/securityHelper');

exports.getCourses = async (req, res, next) => {
  try {
    const { search = '', category = '' } = req.query;
    const query = { status: 'published' };

    if (search) {
      const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { code: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (category) query.category = category;

    // Không bao giờ trả enrollmentKey ra danh sách công khai
    const courses = await Course.find(query)
      .select('-enrollmentKey')
      .populate('teacher', 'fullName email department avatar')
      .populate('category', 'name color')
      .sort({ isFeatured: -1, createdAt: -1 });

    res.json(courses);
  } catch (error) {
    next(error);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .select('-enrollmentKey')
      .populate('teacher', 'fullName email department bio avatar')
      .populate('category', 'name color');

    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });
    res.json(course);
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { title, code, description, category, level, maxStudents, enrollmentKey } = req.body;
    if (!title || !code || !description) {
      return res.status(400).json({ message: 'Tên học phần, mã học phần và mô tả là bắt buộc.' });
    }

    const exists = await Course.findOne({ code: String(code).toUpperCase().trim() });
    if (exists) return res.status(400).json({ message: 'Mã học phần đã tồn tại.' });

    const course = await Course.create({
      title: sanitizeText(title),
      code: String(code).toUpperCase().trim(),
      description: sanitizeText(description),
      category: category || null,
      teacher: req.user._id,
      level: level || 'Cơ bản',
      maxStudents: Number(maxStudents) || 100,
      enrollmentKey: enrollmentKey ? String(enrollmentKey).trim() : '',
    });

    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

exports.addLesson = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    if (String(course.teacher) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thêm bài giảng vào học phần này.' });
    }

    const { title, content, videoUrl, durationMinutes } = req.body;
    const documentUrl = req.file ? `/uploads/${req.file.filename}` : '';

    course.lessons.push({
      title: sanitizeText(title),
      content: sanitizeText(content),
      videoUrl: videoUrl ? String(videoUrl).trim() : '',
      documentUrl,
      durationMinutes: Number(durationMinutes) || 30,
      order: course.lessons.length + 1,
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

exports.deleteLesson = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    if (String(course.teacher) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa bài giảng của học phần này.' });
    }

    course.lessons = course.lessons.filter((l) => String(l._id) !== String(req.params.lessonId));
    await course.save();
    res.json(course);
  } catch (error) {
    next(error);
  }
};

exports.getTeacherCourses = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { teacher: req.user._id };
    const courses = await Course.find(query)
      .select('-enrollmentKey')
      .populate('category', 'name color')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

exports.enrollCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    if (course.enrollmentKey && req.body.enrollmentKey !== course.enrollmentKey) {
      return res.status(400).json({ message: 'Mã ghi danh lớp học không chính xác.' });
    }

    const currentCount = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });
    if (currentCount >= course.maxStudents) {
      return res.status(400).json({ message: 'Lớp học đã đạt sĩ số tối đa.' });
    }

    const existing = await Enrollment.findOne({ student: req.user._id, course: course._id });
    if (existing) {
      return res.status(400).json({
        message:
          existing.status === 'pending'
            ? 'Yêu cầu đăng ký của bạn đang chờ phê duyệt.'
            : 'Bạn đã ghi danh học phần này rồi.',
      });
    }

    const setting = await SystemSetting.findOne({ key: 'global' });
    const isAuto = setting?.autoApproveEnrollment === true || Boolean(course.enrollmentKey);

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: course._id,
      status: isAuto ? 'active' : 'pending',
      reviewedAt: isAuto ? new Date() : undefined,
    });

    res.status(201).json({
      message: isAuto
        ? 'Đăng ký thành công! Bạn có thể vào học ngay.'
        : 'Đã gửi yêu cầu ghi danh. Vui lòng chờ Giảng viên hoặc Phòng Đào tạo duyệt.',
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate({
        path: 'course',
        select: '-enrollmentKey',
        populate: [
          { path: 'teacher', select: 'fullName email department' },
          { path: 'category', select: 'name color' },
        ],
      })
      .sort({ updatedAt: -1 });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

exports.completeLesson = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    });
    if (!enrollment) {
      return res.status(403).json({ message: 'Bạn chưa được duyệt ghi danh học phần này.' });
    }

    const course = await Course.findById(courseId);
    if (!enrollment.completedLessons.some((id) => String(id) === String(lessonId))) {
      enrollment.completedLessons.push(lessonId);
    }

    const total = course.lessons.length || 1;
    enrollment.progress = Math.min(100, Math.round((enrollment.completedLessons.length / total) * 100));
    if (enrollment.progress === 100) enrollment.status = 'completed';

    await enrollment.save();
    res.json(enrollment);
  } catch (error) {
    next(error);
  }
};
