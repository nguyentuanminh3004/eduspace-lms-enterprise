const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const LiveSession = require('../models/LiveSession');
const Discussion = require('../models/Discussion');
const AuditLog = require('../models/AuditLog');
const { calculateSimilarity } = require('../utils/plagiarismChecker');
const { sanitizeText } = require('../utils/securityHelper');

const verifyTeacherOwnsCourse = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) return { error: 404, message: 'Không tìm thấy học phần.' };
  if (user.role !== 'admin' && String(course.teacher) !== String(user._id)) {
    return { error: 403, message: 'Bạn không phải giảng viên phụ trách học phần này.' };
  }
  return { course };
};

// ==================== ASSIGNMENTS & PLAGIARISM CHECK ====================
exports.getAssignmentsByCourse = async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ course: req.params.courseId }).sort({ dueDate: 1 });
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const { course, title, description, dueDate, maxScore, allowLateSubmission } = req.body;
    const check = await verifyTeacherOwnsCourse(course, req.user);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const assignment = await Assignment.create({
      course,
      teacher: req.user._id,
      title: sanitizeText(title),
      description: sanitizeText(description),
      dueDate,
      maxScore: Number(maxScore) || 10,
      attachmentUrl,
      allowLateSubmission: Boolean(allowLateSubmission),
    });
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Không tìm thấy bài tập.' });

    const isLate = new Date() > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ message: 'Đã quá thời hạn nộp bài.' });
    }

    const safeContent = sanitizeText(content);
    const otherSubmissions = await Submission.find({
      assignment: assignment._id,
      student: { $ne: req.user._id },
    }).populate('student', 'fullName');

    const { maxSimilarity, matchedStudentName } = calculateSimilarity(safeContent, otherSubmissions);

    const submission = await Submission.findOneAndUpdate(
      { assignment: assignment._id, student: req.user._id },
      {
        content: safeContent,
        ...(fileUrl && { fileUrl }),
        similarityScore: maxSimilarity,
        matchedStudentName,
        status: isLate ? 'late' : 'submitted',
        submittedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    if (maxSimilarity >= 60) {
      await AuditLog.create({
        actor: req.user._id,
        action: 'PLAGIARISM_ALERT',
        targetType: 'Submission',
        targetId: String(submission._id),
        details: `Cảnh báo trùng lặp ${maxSimilarity}% với bài của ${matchedStudentName} trong bài tập "${assignment.title}"`,
        severity: 'warning',
        ipAddress: req.ip || '',
      }).catch(() => {});
    }

    res.json(submission);
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionsByAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Không tìm thấy bài tập.' });

    if (req.user.role === 'student') {
      const mine = await Submission.find({
        assignment: assignment._id,
        student: req.user._id,
      });
      return res.json(mine);
    }

    const check = await verifyTeacherOwnsCourse(assignment.course, req.user);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const submissions = await Submission.find({ assignment: req.params.assignmentId })
      .populate('student', 'fullName email studentCode')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const { score, feedback } = req.body;
    const submission = await Submission.findById(req.params.submissionId).populate('assignment');
    if (!submission) return res.status(404).json({ message: 'Không tìm thấy bài nộp.' });

    const check = await verifyTeacherOwnsCourse(submission.assignment.course, req.user);
    if (check.error) return res.status(check.error).json({ message: check.message });

    submission.score = Number(score);
    submission.feedback = sanitizeText(feedback || '');
    submission.status = 'graded';
    await submission.save();

    res.json(submission);
  } catch (error) {
    next(error);
  }
};

// ==================== QUIZZES WITH ANTI-CHEATING PROCTORING ====================
exports.getQuizzesByCourse = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ course: req.params.courseId })
      .populate('results.student', 'fullName studentCode email')
      .sort({ createdAt: -1 });

    if (req.user.role === 'student') {
      const sanitized = quizzes.map((q) => {
        const obj = q.toObject();
        obj.questions = obj.questions.map(({ correctOptionIndex, ...rest }) => rest);
        obj.results = (obj.results || []).filter(
          (r) => String(r.student?._id || r.student) === String(req.user._id)
        );
        return obj;
      });
      return res.json(sanitized);
    }

    res.json(quizzes);
  } catch (error) {
    next(error);
  }
};

exports.createQuiz = async (req, res, next) => {
  try {
    const check = await verifyTeacherOwnsCourse(req.body.course, req.user);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const quiz = await Quiz.create({
      ...req.body,
      title: sanitizeText(req.body.title),
      description: sanitizeText(req.body.description || ''),
    });
    res.status(201).json(quiz);
  } catch (error) {
    next(error);
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Không tìm thấy bài kiểm tra.' });

    const { answers = [], tabSwitchCount = 0, violations = [], autoSubmittedDueToCheating = false } = req.body;

    let rawCorrect = 0;
    let totalPoints = 0;

    quiz.questions.forEach((q, idx) => {
      totalPoints += q.points || 1;
      if (answers[idx] === q.correctOptionIndex) {
        rawCorrect += q.points || 1;
      }
    });

    const normalizedScore = totalPoints > 0 ? Number(((rawCorrect / totalPoints) * 10).toFixed(2)) : 0;

    quiz.results.push({
      student: req.user._id,
      score: normalizedScore,
      totalPoints: 10,
      answers,
      tabSwitchCount,
      autoSubmittedDueToCheating,
      violations,
    });

    await quiz.save();

    if (tabSwitchCount > 0 || autoSubmittedDueToCheating) {
      await AuditLog.create({
        actor: req.user._id,
        action: 'QUIZ_PROCTORING_VIOLATION',
        targetType: 'Quiz',
        targetId: String(quiz._id),
        details: `Vi phạm quy chế thi (${tabSwitchCount} lần chuyển tab/rời màn hình) trong bài "${quiz.title}". Tự động thu bài: ${autoSubmittedDueToCheating}`,
        severity: 'critical',
        ipAddress: req.ip || '',
      }).catch(() => {});
    }

    res.json({
      score: normalizedScore,
      rawCorrect,
      totalQuestions: quiz.questions.length,
      passed: normalizedScore >= quiz.passingScore,
      tabSwitchCount,
      autoSubmittedDueToCheating,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== JITSI MEET LIVE SESSIONS & AUTO ATTENDANCE ====================
exports.getLiveSessionsByCourse = async (req, res, next) => {
  try {
    const sessions = await LiveSession.find({ course: req.params.courseId })
      .populate('host', 'fullName email')
      .populate('attendees.user', 'fullName studentCode role')
      .sort({ scheduledAt: -1 });
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

exports.createLiveSession = async (req, res, next) => {
  try {
    const { course, title, durationMinutes } = req.body;
    const check = await verifyTeacherOwnsCourse(course, req.user);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const roomCode = `CLS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const jitsiRoomName = `EduSpaceEnterprise_${course}_${Date.now()}`;

    const session = await LiveSession.create({
      course,
      host: req.user._id,
      title: sanitizeText(title),
      roomCode,
      jitsiRoomName,
      scheduledAt: new Date(),
      durationMinutes: Number(durationMinutes) || 90,
      status: 'live',
    });
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

exports.recordLiveAttendance = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Không tìm thấy phòng học trực tuyến.' });

    const existing = session.attendees.find((a) => String(a.user) === String(req.user._id));
    if (existing) {
      existing.lastPingAt = new Date();
    } else {
      session.attendees.push({ user: req.user._id, joinedAt: new Date(), lastPingAt: new Date() });
    }

    await session.save();
    res.json({ message: 'Đã ghi nhận điểm danh trực tuyến.' });
  } catch (error) {
    next(error);
  }
};

// ==================== DISCUSSIONS & REPLIES ====================
exports.getDiscussionsByCourse = async (req, res, next) => {
  try {
    const discussions = await Discussion.find({ course: req.params.courseId })
      .populate('author', 'fullName role avatar')
      .populate('replies.author', 'fullName role avatar')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(discussions);
  } catch (error) {
    next(error);
  }
};

exports.createDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.create({
      course: req.body.course,
      author: req.user._id,
      title: sanitizeText(req.body.title),
      content: sanitizeText(req.body.content),
    });
    const populated = await Discussion.findById(discussion._id).populate('author', 'fullName role avatar');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

exports.replyDiscussion = async (req, res, next) => {
  try {
    const discussion = await Discussion.findById(req.params.discussionId);
    if (!discussion) return res.status(404).json({ message: 'Không tìm thấy chủ đề thảo luận.' });

    discussion.replies.push({
      author: req.user._id,
      content: sanitizeText(req.body.content),
    });
    await discussion.save();
    const populated = await Discussion.findById(discussion._id)
      .populate('author', 'fullName role avatar')
      .populate('replies.author', 'fullName role avatar');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};
