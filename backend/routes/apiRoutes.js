const express = require('express');
const router = express.Router();

const { protect, authorize, requireCourseAccess } = require('../middlewares/authMiddleware');
const { uploadAvatar, verifyImageSignature } = require('../middlewares/avatarUpload');
const upload = require('../middlewares/uploadMiddleware');

const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const courseController = require('../controllers/courseController');
const enrollmentController = require('../controllers/enrollmentController');
const learningController = require('../controllers/learningController');
const adminController = require('../controllers/adminController');

// 1. AUTH & PROFILE SECURITY
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);
router.put('/auth/profile', protect, profileController.updateProfile);
router.post('/auth/avatar', protect, uploadAvatar.single('avatar'), verifyImageSignature, profileController.uploadUserAvatar);
router.put('/auth/change-password', protect, authController.changePassword);
router.get('/auth/activity-logs', protect, profileController.getMyActivityLogs);

// 2. CATEGORIES & COURSES
router.get('/categories', adminController.getCategories);
router.get('/courses', courseController.getCourses);
router.get('/courses/:id', courseController.getCourseById);
router.post('/courses', protect, authorize('admin', 'teacher'), courseController.createCourse);
router.post('/courses/:id/lessons', protect, authorize('admin', 'teacher'), upload.single('document'), courseController.addLesson);
router.delete('/courses/:id/lessons/:lessonId', protect, authorize('admin', 'teacher'), courseController.deleteLesson);
router.get('/teacher/courses', protect, authorize('admin', 'teacher'), courseController.getTeacherCourses);

// 3. ENROLLMENT APPROVAL WORKFLOW (PENDING -> ACTIVE)
router.post('/courses/:id/enroll', protect, authorize('student'), courseController.enrollCourse);
router.get('/enrollments/my', protect, courseController.getMyEnrollments);
router.get('/enrollments', protect, authorize('admin', 'teacher'), enrollmentController.getAllEnrollments);
router.post('/enrollments/request', protect, authorize('student'), enrollmentController.requestEnrollment);
router.patch('/enrollments/:id/review', protect, authorize('admin', 'teacher'), enrollmentController.reviewEnrollment);
router.patch('/enrollments/settings/auto-approve', protect, authorize('admin'), enrollmentController.toggleAutoApprove);
router.put('/enrollments/:courseId/lessons/:lessonId/complete', protect, courseController.completeLesson);

// 4. LEARNING WORKSPACE (ASSIGNMENTS, PLAGIARISM, QUIZZES, JITSI LIVE, DISCUSSIONS)
router.get('/courses/:courseId/assignments', protect, requireCourseAccess, learningController.getAssignmentsByCourse);
router.post('/assignments', protect, authorize('admin', 'teacher'), upload.single('attachment'), learningController.createAssignment);
router.post('/assignments/:assignmentId/submit', protect, authorize('student'), upload.single('file'), learningController.submitAssignment);
router.get('/assignments/:assignmentId/submissions', protect, learningController.getSubmissionsByAssignment);
router.put('/submissions/:submissionId/grade', protect, authorize('admin', 'teacher'), learningController.gradeSubmission);

router.get('/courses/:courseId/quizzes', protect, requireCourseAccess, learningController.getQuizzesByCourse);
router.post('/quizzes', protect, authorize('admin', 'teacher'), learningController.createQuiz);
router.post('/quizzes/:quizId/submit', protect, authorize('student'), learningController.submitQuiz);

router.get('/courses/:courseId/live', protect, requireCourseAccess, learningController.getLiveSessionsByCourse);
router.post('/live', protect, authorize('admin', 'teacher'), learningController.createLiveSession);
router.post('/live/:sessionId/attendance', protect, learningController.recordLiveAttendance);

router.get('/courses/:courseId/discussions', protect, requireCourseAccess, learningController.getDiscussionsByCourse);
router.post('/discussions', protect, requireCourseAccess, learningController.createDiscussion);
router.post('/discussions/:discussionId/replies', protect, learningController.replyDiscussion);

// 5. ADMIN GOVERNANCE, CSV IMPORT & AUDIT LOGS
router.get('/admin/stats', protect, authorize('admin'), adminController.getSystemStats);
router.get('/admin/users', protect, authorize('admin'), adminController.getAllUsers);
router.post('/admin/users', protect, authorize('admin'), adminController.createUserByAdmin);
router.post('/admin/users/import-csv', protect, authorize('admin'), upload.single('csvFile'), adminController.bulkImportUsersCsv);
router.put('/admin/users/:id', protect, authorize('admin'), adminController.updateUserByAdmin);
router.delete('/admin/users/:id', protect, authorize('admin'), adminController.deleteUserByAdmin);

router.get('/admin/courses', protect, authorize('admin'), adminController.getAllCoursesAdmin);
router.put('/admin/courses/:id', protect, authorize('admin'), adminController.updateCourseByAdmin);
router.delete('/admin/courses/:id', protect, authorize('admin'), adminController.deleteCourseByAdmin);

router.post('/admin/categories', protect, authorize('admin'), adminController.createCategory);
router.put('/admin/categories/:id', protect, authorize('admin'), adminController.updateCategory);
router.get('/admin/audit-logs', protect, authorize('admin'), adminController.getAuditLogs);

module.exports = router;
