const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  points: { type: Number, default: 1 },
});

const violationLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const quizResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  answers: [{ type: Number }],
  tabSwitchCount: { type: Number, default: 0 },
  autoSubmittedDueToCheating: { type: Boolean, default: false },
  violations: [violationLogSchema],
  submittedAt: { type: Date, default: Date.now },
});

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 30 },
    passingScore: { type: Number, default: 5 },
    maxViolationsAllowed: { type: Number, default: 3 },
    strictProctoring: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
    questions: [questionSchema],
    results: [quizResultSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
