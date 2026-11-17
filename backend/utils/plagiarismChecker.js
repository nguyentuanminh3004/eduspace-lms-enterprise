/**
 * Thuật toán tính độ tương đồng văn bản (N-gram Jaccard Similarity)
 * Hỗ trợ phát hiện sao chép nội dung bài nộp giữa các sinh viên trong cùng bài tập.
 */
function tokenizeNGrams(text, n = 3) {
  const clean = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter(Boolean);
  if (words.length < n) return new Set(words);

  const grams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(' '));
  }
  return grams;
}

function calculateSimilarity(newContent, existingSubmissions) {
  const targetGrams = tokenizeNGrams(newContent, 3);
  if (targetGrams.size === 0 || !existingSubmissions.length) {
    return { maxSimilarity: 0, matchedStudentName: '' };
  }

  let maxSim = 0;
  let matchedName = '';

  for (const sub of existingSubmissions) {
    const compareGrams = tokenizeNGrams(sub.content, 3);
    if (compareGrams.size === 0) continue;

    let intersection = 0;
    targetGrams.forEach((gram) => {
      if (compareGrams.has(gram)) intersection++;
    });

    const union = new Set([...targetGrams, ...compareGrams]).size;
    const score = union > 0 ? Math.round((intersection / union) * 100) : 0;

    if (score > maxSim) {
      maxSim = score;
      matchedName = sub.student?.fullName || 'Học viên khác';
    }
  }

  return { maxSimilarity: maxSim, matchedStudentName: matchedName };
}

module.exports = { calculateSimilarity };
