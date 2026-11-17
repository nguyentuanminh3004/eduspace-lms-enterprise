const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  documentUrl: { type: String, default: '' },
  durationMinutes: { type: Number, default: 30 },
  order: { type: Number, default: 1 },
  isPreview: { type: Boolean, default: false },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    level: {
      type: String,
      enum: ['Cơ bản', 'Trung cấp', 'Nâng cao'],
      default: 'Cơ bản',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    isFeatured: { type: Boolean, default: false },
    maxStudents: { type: Number, default: 100 },
    enrollmentKey: { type: String, default: '' },
    lessons: [lessonSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
