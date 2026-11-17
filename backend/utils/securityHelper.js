// Loại bỏ các thẻ HTML nguy hiểm chống Stored XSS
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const validatePasswordStrength = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return false;
  return PASSWORD_REGEX.test(pwd);
};

module.exports = { sanitizeText, validatePasswordStrength, PASSWORD_REGEX };
