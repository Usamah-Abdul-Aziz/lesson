/**
 * Normalisasi jawaban isian singkat (§5.4)
 * - trim, lowercase, hilangkan spasi ganda
 * - deteksi bentuk setara sederhana untuk matematika (mis. "1/2" == "0.5")
 */

export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,](?=\s*$)/, ''); // hilangkan titik/koma di akhir kalimat
};

/**
 * Cek apakah jawaban murid cocok dengan kumpulan jawaban benar yang diterima.
 * `acceptedAnswers` = daftar bentuk setara yang diizinkan (mis. ["7", "tujuh"]).
 */
export function isShortAnswerCorrect(
  studentAnswer: string,
  acceptedAnswers: string[],
): boolean {
  const normalized = normalizeAnswer(studentAnswer);
  if (normalized === '') return false;
  return acceptedAnswers.some((accepted) => {
    const normalizedAccepted = normalizeAnswer(accepted);
    if (normalized === normalizedAccepted) return true;
    return areEquivalentNumbers(normalized, normalizedAccepted);
  });
}

/** Bentuk setara numerik dasar: pecahan vs desimal, nol di depan, tanda kurung. */
function areEquivalentNumbers(a: string, b: string): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return Math.abs(numA - numB) < 1e-6;
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[()]/g, '').replace(/\s/g, '');
  if (cleaned === '') return null;

  // Pecahan "a/b"
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}
