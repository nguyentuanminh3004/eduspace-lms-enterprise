const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

// GET /api/enrollments - Admin xem tất cả, Teacher chỉ xem sinh viên đăng ký vào lớp mình dạy
exports.getAllEnrollments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      const myCourses = await Course.find({ teacher: req.user._id }).select('_id');
      const courseIds = myCourses.map((c) => c._id);
      query = { course: { $in: courseIds } };
    }

    const enrollments = await Enrollment.find(query)
      .populate('student', 'fullName email studentCode department avatar')
      .populate('course', 'code title teacher')
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 });

    const setting = await SystemSetting.findOne({ key: 'global' });
    res.json({
      enrollments,
      autoApproveEnrollment: Boolean(setting?.autoApproveEnrollment),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/enrollments/request
exports.requestEnrollment = async (req, res, next) => {
  try {
    const courseId = req.body.courseId || req.body.course;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy học phần.' });

    const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (existing) {
      return res.status(400).json({
        message:
          existing.status === 'pending'
            ? 'Yêu cầu đăng ký của bạn đang chờ phê duyệt.'
            : existing.status === 'rejected'
            ? 'Yêu cầu đăng ký trước đó đã bị từ chối. Vui lòng liên hệ giảng viên.'
            : 'Bạn đã ghi danh học phần này rồi.',
      });
    }

    const setting = await SystemSetting.findOne({ key: 'global' });
    const isAuto = setting?.autoApproveEnrollment === true;

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: courseId,
      status: isAuto ? 'active' : 'pending',
      reviewedAt: isAuto ? new Date() : undefined,
    });

    res.status(201).json({
      message: isAuto
        ? 'Đăng ký thành công! Bạn có thể vào học ngay.'
        : 'Đã gửi yêu cầu đăng ký. Vui lòng chờ Giảng viên hoặc Phòng Đào tạo phê duyệt.',
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/enrollments/:id/review - Kiểm tra chống IDOR: Teacher chỉ duyệt được lớp của chính mình
exports.reviewEnrollment = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const enrollment = await Enrollment.findById(req.params.id).populate('course');
    if (!enrollment) return res.status(404).json({ message: 'Không tìm thấy bản ghi đăng ký.' });

    if (
      req.user.role === 'teacher' &&
      String(enrollment.course?.teacher) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Bạn chỉ có quyền phê duyệt sinh viên đăng ký vào học phần do bạn phụ trách.',
      });
    }

    enrollment.status = status;
    enrollment.reviewedBy = req.user._id;
    enrollment.reviewedAt = new Date();
    await enrollment.save();

    await enrollment.populate('student', 'fullName email studentCode');

    await AuditLog.create({
      actor: req.user._id,
      action: status === 'active' ? 'APPROVE_ENROLLMENT' : 'REJECT_ENROLLMENT',
      targetType: 'Enrollment',
      targetId: String(enrollment._id),
      details: `${status === 'active' ? 'Phê duyệt' : 'Từ chối'} sinh viên ${enrollment.student?.fullName} vào học phần [${enrollment.course?.code}]`,
      severity: 'info',
      ipAddress: req.ip || '',
    }).catch(() => {});

    res.json({
      message: status === 'active' ? 'Đã phê duyệt học viên vào lớp.' : 'Đã từ chối yêu cầu ghi danh.',
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/enrollments/settings/auto-approve
exports.toggleAutoApprove = async (req, res, next) => {
  try {
    const val =
      req.body.autoApproveEnrollment !== undefined
        ? req.body.autoApproveEnrollment
        : req.body.autoApprove;

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'global' },
      { autoApproveEnrollment: Boolean(val) },
      { upsert: true, new: true }
    );

    res.json({
      message: setting.autoApproveEnrollment
        ? 'Đã BẬT chế độ Duyệt đăng ký tự động.'
        : 'Đã chuyển sang chế độ Duyệt đăng ký thủ công.',
      setting,
    });
  } catch (error) {
    next(error);
  }
};
