const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 10 },
    attachmentUrl: { type: String, default: '' },
    allowLateSubmission: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
