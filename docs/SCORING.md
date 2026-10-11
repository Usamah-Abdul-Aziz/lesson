# Sistem Penilaian IRT / "Katrol"

> **Inti aplikasi** (§5.5): soal yang banyak dijawab benar oleh murid lain
> bobotnya kecil; soal yang jarang dijawab benar bobotnya besar.

---

## Batasan Statistik Penting

Dengan **hanya 8-9 murid**, kalibrasi IRT penuh (model 2PL/3PL) **tidak stabil
secara statistik** — estimasi parameter (diskriminasi, tebakan, kesulitan) akan
sangat melebar pada sampel sekecil itu. Oleh karena itu implementasi dilakukan
**bertingkat**:

| Level | Model | Kapan dipakai |
|---|---|---|
| **1** | Bobot kesulitan empiris (prior Bayesian) | **Default**, stabil pada data kecil |
| **2** | Model Rasch (1PL) dengan regularisasi | Opsional, perlu ≥ 30 respon/soal |

Pada Level 1, `estimated_difficulty` dari AI/guru dipakai sebagai **prior** agar
bobot masuk akal bahkan sebelum ada satupun jawaban terkumpul.

---

## Level 1 — Rumus

Untuk setiap soal *i*:

```
p_prior_i   = f(estimated_difficulty)     -- 1→0.9, 2→0.75, 3→0.5, 4→0.32, 5→0.2
p_smooth_i  = (n_correct_i + k · p_prior_i) / (n_responses_i + k)     -- k = 3
b_i         = ln((1 − p_smooth_i) / p_smooth_i)                       -- logit kesulitan
w_i         = clamp(1 + α · b_i, w_min, w_max)                        -- α = 0.5, w ∈ [0.5, 2.0]
```

Skor murid (0-100) untuk satu tes:

```
skor = 100 · Σ(w_i · benar_i) / Σ(w_i)
```

Semua parameter dapat diatur melalui tabel `scoring_config` (default sesuai §5.5).

### Mengapa ini "katrol"?
Soal dengan `p_smooth` kecil (jarang dijawab benar) → `b_i` besar → `w_i` besar.
Murid yang **benar menjawab soal sulit** mendapat porsi skor lebih besar daripada
murid yang hanya benar di soal mudah. Lihat unit test
`__tests__/scoring.test.ts` → kasus "memberi skor lebih tinggi saat benar di soal
sulit".

### Kalibrasi awal
Bila `n_responses < 3`, soal ditandai **"kalibrasi awal"** dan bobotnya didominasi
prior (belum cukup data empiris). Tanda ini ditampilkan di analisis butir guru.

---

## Level 2 — Model Rasch (opsional, Fase 7)

```
P(benar) = 1 / (1 + e^(−(θ_j − b_i)))
```

- `θ_j` kemampuan murid, `b_i` kesulitan soal.
- Estimasi: iterasi sederhana (JMLE / Newton-Raphson) dengan **prior normal**
  sebagai regularisasi agar stabil pada data kecil.
- Konversi: `skor = clamp(50 + 10·θ, 0, 100)`.
- **Hanya aktif** bila `scoring_config.rasch_enabled = true` **dan** setiap soal
  sudah memiliki ≥ 30 respon (akumulasi beberapa periode). Jika tidak, sistem
  otomatis kembali ke Level 1.

---

## Transparansi & Riwayat

- Layar hasil menampilkan **skor mentah** (jumlah benar) **dan skor terbobot**.
- Saat attempt di-submit, disimpan `weights_snapshot` (bobot saat itu) +
  `raw_score` + `weighted_score`. **Riwayat tidak berubah diam-diam** saat
  kalibrasi ulang.
- Jika bobot direkalkulasi kemudian, ditampilkan juga "skor terkini" di samping
  "skor saat submit".

---

## Analisis Butir Soal (Fase 4, guru)

Tabel per soal: `n`, `p`, `b`, bobot, status kalibrasi, serta daya beda sederhana
(korelasi item-total bila memungkinkan).

---

## Unit Test

Jalankan `npm test`. Kasus yang dicakup (`__tests__/scoring.test.ts`):

- semua benar → 100; semua salah → 0
- data sedikit → kembali ke prior (bobot = 1 untuk prior 0.5)
- soal dengan `p` ekstrem tidak menghasilkan NaN
- benar di soal sulit > benar di soal mudah
- normalisasi jawaban isian (case, spasi, pecahan vs desimal)
