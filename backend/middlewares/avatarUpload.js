// backend/middleware/avatarUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        const ext = extMap[file.mimetype] || '.jpg';
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});

const uploadAvatar = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WebP.'));
        }
        cb(null, true);
    },
});

// Kiểm tra Magic Bytes thực tế để chống giả mạo đuôi file (.html/.svg/.js đổi thành .jpg)
const verifyImageSignature = async (req, res, next) => {
    if (!req.file) return next();
    try {
        const fd = await fs.promises.open(req.file.path, 'r');
        const buffer = Buffer.alloc(12);
        await fd.read(buffer, 0, 12, 0);
        await fd.close();

        const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng =
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isWebp =
            buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

        if (!isJpeg && !isPng && !isWebp) {
            await fs.promises.unlink(req.file.path).catch(() => { });
            return res.status(400).json({ message: 'Tệp tải lên không phải ảnh hợp lệ (lỗi chữ ký tệp).' });
        }
        next();
    } catch (err) {
        await fs.promises.unlink(req.file.path).catch(() => { });
        return res.status(400).json({ message: 'Không thể xác thực tệp ảnh.' });
    }
};

module.exports = { uploadAvatar, verifyImageSignature };