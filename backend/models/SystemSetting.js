// backend/models/SystemSetting.js
const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        autoApproveEnrollment: { type: Boolean, default: false }, // false = duyệt thủ công, true = duyệt tự động
    },
    { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);