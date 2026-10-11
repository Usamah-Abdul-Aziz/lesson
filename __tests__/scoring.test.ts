import {
  difficultyB,
  difficultyPrior,
  questionWeight,
  rawScore,
  scoreAttempt,
  smoothP,
  weightedScore,
} from '@/utils/scoring';
import { isShortAnswerCorrect } from '@/utils/scoring/normalize';

describe('scoring: katrol Level 1', () => {
  describe('difficultyPrior', () => {
    it('memetakan estimated_difficulty ke prior peluang benar', () => {
      expect(difficultyPrior(1)).toBe(0.9);
      expect(difficultyPrior(3)).toBe(0.5);
      expect(difficultyPrior(5)).toBe(0.2);
    });

    it('membatasi input di luar rentang 1-5', () => {
      expect(difficultyPrior(0)).toBe(0.9);
      expect(difficultyPrior(99)).toBe(0.2);
    });
  });

  describe('smoothP', () => {
    it('mengikuti data ketika n besar', () => {
      // (90 + 3*0.5) / (100 + 3) = 91.5 / 103
      expect(smoothP(90, 100, 0.5, 3)).toBeCloseTo(91.5 / 103, 6);
    });

    it('mendekati prior ketika n kecil', () => {
      expect(smoothP(0, 1, 0.9, 3)).toBeCloseTo(0.675, 3);
    });
  });

  describe('difficultyB (logit)', () => {
    it('negatif untuk soal mudah, positif untuk soal sulit', () => {
      expect(difficultyB(0.9)).toBeLessThan(0);
      expect(difficultyB(0.2)).toBeGreaterThan(0);
      expect(difficultyB(0.5)).toBeCloseTo(0, 6);
    });

    it('tidak meledak pada nilai ekstrem', () => {
      expect(difficultyB(0)).toBeLessThan(10);
      expect(difficultyB(1)).toBeGreaterThan(-10);
    });
  });

  describe('questionWeight', () => {
    it('soal sulit (jarang benar) dapat bobot lebih besar', () => {
      const easy = questionWeight(0.9);
      const hard = questionWeight(0.2);
      expect(hard).toBeGreaterThan(easy);
    });

    it('dibatasi ke [w_min, w_max]', () => {
      expect(questionWeight(0.0001)).toBeLessThanOrEqual(2.0);
      expect(questionWeight(0.9999)).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('weightedScore', () => {
    it('semua benar -> 100', () => {
      const answers = [
        { questionId: 'q1', weight: 1.5, isCorrect: true },
        { questionId: 'q2', weight: 0.8, isCorrect: true },
      ];
      expect(weightedScore(answers)).toBeCloseTo(100, 6);
      expect(rawScore(answers)).toBeCloseTo(100, 6);
    });

    it('semua salah -> 0', () => {
      const answers = [
        { questionId: 'q1', weight: 1.5, isCorrect: false },
        { questionId: 'q2', weight: 0.8, isCorrect: false },
      ];
      expect(weightedScore(answers)).toBeCloseTo(0, 6);
      expect(rawScore(answers)).toBeCloseTo(0, 6);
    });

    it('membagi setara ketika bobot sama', () => {
      const answers = [
        { questionId: 'q1', weight: 1, isCorrect: true },
        { questionId: 'q2', weight: 1, isCorrect: false },
      ];
      expect(weightedScore(answers)).toBeCloseTo(50, 6);
    });

    it('memberi skor lebih tinggi saat benar di soal sulit (inti katrol)', () => {
      // Dua murid mengerjakan DUA soal yang sama (hard w=2.0, easy w=0.5).
      const sameQuestions = [
        { questionId: 'hard', weight: 2.0 },
        { questionId: 'easy', weight: 0.5 },
      ];
      const correctOnHard = sameQuestions.map((q) => ({
        ...q,
        isCorrect: q.questionId === 'hard',
      }));
      const correctOnEasy = sameQuestions.map((q) => ({
        ...q,
        isCorrect: q.questionId === 'easy',
      }));
      // Skor mentah sama (1 dari 2), tapi skor terbobot membedakan.
      expect(rawScore(correctOnHard)).toBeCloseTo(rawScore(correctOnEasy), 6);
      expect(weightedScore(correctOnHard)).toBeCloseTo(100 * 2.0 / 2.5, 6);
      expect(weightedScore(correctOnEasy)).toBeCloseTo(100 * 0.5 / 2.5, 6);
      expect(weightedScore(correctOnHard)).toBeGreaterThan(weightedScore(correctOnEasy));
    });

    it('mengembalikan 0 untuk array kosong', () => {
      expect(weightedScore([])).toBe(0);
      expect(rawScore([])).toBe(0);
    });
  });

  describe('scoreAttempt', () => {
    const calibrations = [
      { questionId: 'q1', nResponses: 10, nCorrect: 9, estimatedDifficulty: 1 },
      { questionId: 'q2', nResponses: 10, nCorrect: 1, estimatedDifficulty: 5 },
    ];

    it('menghasilkan snapshot bobot untuk setiap soal', () => {
      const result = scoreAttempt(calibrations, new Set(['q1']));
      expect(Object.keys(result.weights)).toEqual(['q1', 'q2']);
      const w1 = result.weights['q1'];
      const w2 = result.weights['q2'];
      expect(w1).toBeDefined();
      expect(w2).toBeDefined();
      // Soal yang jarang dijawab benar (q2) dapat bobot lebih besar (efek katrol)
      expect(w2 as number).toBeGreaterThan(w1 as number);
    });

    it('menghitung skor mentah dan terbobot secara konsisten', () => {
      const result = scoreAttempt(calibrations, new Set(['q2']));
      expect(result.rawScore).toBeCloseTo(50, 6);
      // Benar hanya di soal sulit -> skor terbobot > skor mentah
      expect(result.weightedScore).toBeGreaterThan(50);
    });

    it('kembali ke prior ketika data sedikit (kalibrasi awal)', () => {
      const few = [{ questionId: 'q1', nResponses: 0, nCorrect: 0, estimatedDifficulty: 3 }];
      const result = scoreAttempt(few, new Set());
      // prior 0.5 -> b=0 -> w=1
      expect(result.weights['q1']).toBeCloseTo(1, 6);
      expect(result.weightedScore).toBeCloseTo(0, 6);
    });

    it('soal ber-p ekstrem tidak menghasilkan bobot NaN', () => {
      const extreme = [
        { questionId: 'q1', nResponses: 5, nCorrect: 5, estimatedDifficulty: 1 },
        { questionId: 'q2', nResponses: 5, nCorrect: 0, estimatedDifficulty: 5 },
      ];
      const result = scoreAttempt(extreme, new Set(['q1', 'q2']));
      expect(Number.isFinite(result.weightedScore)).toBe(true);
      expect(result.weightedScore).toBeCloseTo(100, 6);
    });
  });
});

describe('scoring: normalisasi jawaban isian', () => {
  it('membandingkan tanpa memedulikan huruf besar/kecil dan spasi', () => {
    expect(isShortAnswerCorrect('  Tujuh  ', ['tujuh'])).toBe(true);
    expect(isShortAnswerCorrect('7', ['tujuh'])).toBe(false);
  });

  it('menerima bentuk setara pecahan dan desimal', () => {
    expect(isShortAnswerCorrect('1/2', ['0.5'])).toBe(true);
    expect(isShortAnswerCorrect('0.5', ['1/2'])).toBe(true);
    expect(isShortAnswerCorrect('3/4', ['0.75'])).toBe(true);
  });

  it('menolak jawaban kosong', () => {
    expect(isShortAnswerCorrect('', ['7'])).toBe(false);
    expect(isShortAnswerCorrect('   ', ['7'])).toBe(false);
  });

  it('menolak jawaban yang sama sekali berbeda', () => {
    expect(isShortAnswerCorrect('delapan', ['7', 'tujuh'])).toBe(false);
  });
});
