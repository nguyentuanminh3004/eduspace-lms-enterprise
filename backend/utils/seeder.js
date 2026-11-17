require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const LiveSession = require('../models/LiveSession');

const seedData = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      Course.deleteMany(),
      Enrollment.deleteMany(),
      Assignment.deleteMany(),
      Quiz.deleteMany(),
      LiveSession.deleteMany(),
    ]);

    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@eduspace.edu.vn';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@2026!Secure';

    const admin = await User.create({
      fullName: 'Quản Trị Viên Đào Tạo',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      department: 'Phòng Quản Lý Đào Tạo & CNTT',
      mustChangePassword: false,
    });

    const teacher = await User.create({
      fullName: 'TS. Trần Minh Khoa',
      email: 'khoa.tm@eduspace.edu.vn',
      password: 'Teacher@2026!Secure',
      role: 'teacher',
      department: 'Khoa Kỹ Thuật Phần Mềm',
      bio: 'Giảng viên bộ môn Kiến trúc Phần mềm & Hệ thống Phân tán.',
    });

    const student = await User.create({
      fullName: 'Nguyễn Tuấn Minh',
      email: 'minh.nt@eduspace.edu.vn',
      password: 'Student@2026!Secure',
      role: 'student',
      studentCode: 'SV2026001',
      department: 'Khoa Công Nghệ Thông Tin',
    });

    const categories = await Category.insertMany([
      { name: 'Kỹ thuật Phần mềm', slug: 'ky-thuat-phan-mem', description: 'Kiến trúc Web, Mobile & Cloud', color: '#1d4ed8' },
      { name: 'Khoa học Dữ liệu & AI', slug: 'khoa-hoc-du-lieu', description: 'Học máy, Xử lý dữ liệu lớn', color: '#0f766e' },
      { name: 'An toàn Thông tin', slug: 'an-toan-thong-tin', description: 'Bảo mật hệ thống & Mật mã học', color: '#b45309' },
    ]);

    const course1 = await Course.create({
      title: 'Kiến trúc Ứng dụng Web Doanh nghiệp (MERN Stack)',
      code: 'SE401',
      description: 'Xây dựng hệ thống web bảo mật chuẩn doanh nghiệp với MongoDB, Express, React, Node.js, Socket.io và WebRTC.',
      category: categories[0]._id,
      teacher: teacher._id,
      level: 'Trung cấp',
      status: 'published',
      isFeatured: true,
      lessons: [
        {
          title: 'Chương 1: Kiến trúc Phân tầng & Bảo mật API với JWT/RBAC',
          content: 'Thiết kế hệ thống phân quyền chặt chẽ, phòng chống tấn công Brute-force, XSS, NoSQL Injection và ghi vết Audit Log.',
          durationMinutes: 45,
          order: 1,
        },
        {
          title: 'Chương 2: Giao tiếp Thời gian thực với Socket.io & WebRTC',
          content: 'Xây dựng phòng học trực tuyến, đồng bộ trạng thái điểm danh và cảnh báo giám sát thi cử.',
          durationMinutes: 50,
          order: 2,
        },
      ],
    });

    await Enrollment.create({
      student: student._id,
      course: course1._id,
      completedLessons: [course1.lessons[0]._id],
      progress: 50,
    });

    await Assignment.create({
      course: course1._id,
      teacher: teacher._id,
      title: 'Đồ án Thực hành 01: Xây dựng Hệ thống Xác thực & Phân quyền RBAC',
      description: 'Triển khai cơ chế cấp phát tài khoản tập trung, khóa tài khoản vi phạm và ghi nhật ký hệ thống.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxScore: 10,
      allowLateSubmission: true,
    });

    await Quiz.create({
      course: course1._id,
      title: 'Bài kiểm tra Giám sát Chương 1: Bảo mật Web & HTTP',
      description: 'Hệ thống bật chế độ giám sát chống chuyển tab. Rời khỏi màn hình thi quá 3 lần sẽ tự động thu bài.',
      durationMinutes: 15,
      passingScore: 5,
      maxViolationsAllowed: 3,
      strictProctoring: true,
      questions: [
        {
          questionText: 'Cơ chế nào giúp ngăn chặn tấn công vét cạn (Brute-force) vào endpoint đăng nhập?',
          options: ['CORS', 'Rate Limiting', 'Static Caching', 'Gzip Compression'],
          correctOptionIndex: 1,
          points: 1,
        },
        {
          questionText: 'Trong mô hình RBAC khép kín, ai là người có quyền cấp phát tài khoản mới?',
          options: ['Khách vãng lai', 'Sinh viên tự đăng ký', 'Quản trị viên (Admin)', 'Trình duyệt tự tạo'],
          correctOptionIndex: 2,
          points: 1,
        },
        {
          questionText: 'Thuật toán nào được dùng để phát hiện mức độ trùng lặp nội dung bài nộp?',
          options: ['Bubble Sort', 'N-gram Jaccard Similarity', 'Round Robin', 'Binary Search'],
          correctOptionIndex: 1,
          points: 1,
        },
      ],
    });

    await LiveSession.create({
      course: course1._id,
      host: teacher._id,
      title: 'Phiên giảng trực tuyến: Hướng dẫn Bảo mật Hệ thống & Jitsi WebRTC',
      roomCode: 'CLS-SE401',
      jitsiRoomName: 'EduSpaceEnterprise_SE401_Live',
      scheduledAt: new Date(),
      durationMinutes: 90,
      status: 'live',
    });

    console.log('[Seeder] Khởi tạo dữ liệu hệ thống thành công.');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Lỗi:', error);
    process.exit(1);
  }
};

seedData();
