/**
 * Skoring "katrol" Level 1 (§5.5)
 * --------------------------------------------------
 * p_i_smooth = (benar_i + k * p_prior_i) / (n_i + k)
 * b_i        = ln((1 - p_i_smooth) / p_i_smooth)
 * w_i        = clamp(1 + alpha * b_i, w_min, w_max)
 * skor       = 100 * Σ(w_i . benar_i) / Σ(w_i)
 *
 * Efek "katrol": soal yang jarang dijawab benar (p kecil -> b besar -> w besar)
 * memberi kontribusi lebih besar bagi murid yang menjawab benar.
 */

export interface ScoringParams {
  alpha: number;
  wMin: number;
  wMax: number;
  smoothingK: number;
}

export const DEFAULT_SCORING_PARAMS: ScoringParams = {
  alpha: 0.5,
  wMin: 0.5,
  wMax: 2.0,
  smoothingK: 3,
};

/** Prior peluang benar diturunkan dari estimated_difficulty (1-5). */
export function difficultyPrior(estimatedDifficulty: number): number {
  const d = Math.min(5, Math.max(1, Math.round(estimatedDifficulty)));
  // d dijamin 1..5, sehingga table[d] selalu terdefinisi.
  const table: Record<number, number> = { 1: 0.9, 2: 0.75, 3: 0.5, 4: 0.32, 5: 0.2 };
  return table[d]!;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Proporsi benar dengan smoothing Bayesian (prior dari kesulitan estimasi). */
export function smoothP(
  correct: number,
  n: number,
  prior: number,
  k: number,
): number {
  if (k <= 0) {
    return n === 0 ? prior : correct / n;
  }
  return (correct + k * prior) / (n + k);
}

/** Logit kesulitan: makin besar = makin sulit. */
export function difficultyB(pSmooth: number): number {
  const clamped = clamp(pSmooth, 0.001, 0.999);
  return Math.log((1 - clamped) / clamped);
}

export function questionWeight(
  pSmooth: number,
  params: ScoringParams = DEFAULT_SCORING_PARAMS,
): number {
  return clamp(1 + params.alpha * difficultyB(pSmooth), params.wMin, params.wMax);
}

export interface AnsweredQuestion {
  questionId: string;
  weight: number;
  isCorrect: boolean;
}

/**
 * Skor terbobot 0-100 untuk satu tes.
 * `weights` dapat di-supply eksplisit (snapshot) atau dihitung dari params.
 */
export function weightedScore(answers: AnsweredQuestion[]): number {
  if (answers.length === 0) return 0;
  const sumW = answers.reduce((acc, a) => acc + a.weight, 0);
  if (sumW === 0) return 0;
  const sumWC = answers.reduce((acc, a) => acc + (a.isCorrect ? a.weight : 0), 0);
  return (100 * sumWC) / sumW;
}

/** Skor mentah: persentase jawaban benar (untuk transparansi). */
export function rawScore(answers: AnsweredQuestion[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.isCorrect).length;
  return (100 * correct) / answers.length;
}

/**
 * Hitung bobot & skor sekaligus untuk satu attempt.
 * `questionStats` = data kalibrasi per soal; bila soal belum ada datanya,
 * gunakan prior dari estimated_difficulty (kalibrasi awal, §5.5).
 */
export interface QuestionCalibration {
  questionId: string;
  nResponses: number;
  nCorrect: number;
  estimatedDifficulty: number;
}

export interface ScoreResult {
  rawScore: number;
  weightedScore: number;
  /** bobot per soal yang dipakai (untuk disimpan sebagai snapshot) */
  weights: Record<string, number>;
}

export function scoreAttempt(
  calibrations: QuestionCalibration[],
  correctQuestionIds: Set<string>,
  params: ScoringParams = DEFAULT_SCORING_PARAMS,
): ScoreResult {
  const weights: Record<string, number> = {};
  const answers: AnsweredQuestion[] = calibrations.map((c) => {
    const prior = difficultyPrior(c.estimatedDifficulty);
    const pSmooth = smoothP(c.nCorrect, c.nResponses, prior, params.smoothingK);
    const w = questionWeight(pSmooth, params);
    weights[c.questionId] = w;
    return { questionId: c.questionId, weight: w, isCorrect: correctQuestionIds.has(c.questionId) };
  });

  return {
    rawScore: rawScore(answers),
    weightedScore: weightedScore(answers),
    weights,
  };
}

/** True bila soal masih dalam tahap "kalibrasi awal" (< 3 respon). */
export function isEarlyCalibration(nResponses: number): boolean {
  return nResponses < 3;
}
