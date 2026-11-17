// backend/models/Enrollment.js
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Tự động dọn dẹp index cũ gây lỗi E11000
enrollmentSchema.statics.cleanLegacyIndexes = async function () {
  try {
    const indexes = await this.collection.indexes();
    const legacy = indexes.find((idx) => idx.name === 'studentId_1_courseId_1');
    if (legacy) {
      await this.collection.dropIndex('studentId_1_courseId_1');
      console.log('[DB] Đã tự động xóa index cũ studentId_1_courseId_1');
    }
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.warn('[DB] Kiểm tra index enrollments:', err.message);
    }
  }
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);