# Arsitektur Les App

## Diagram

```
┌──────────────────────────────────────────────────────┐
│ Mobile App (Expo SDK 52, TypeScript strict)          │
│                                                      │
│  Expo Router                                         │
│  ├─ index.tsx ── AuthGate ──┬─> (auth)/login         │
│                             ├─> (teacher)/*          │
│                             └─> (student)/*          │
│                                                      │
│  State:  TanStack Query (server) + Zustand (auth)    │
│  UI:     React Native Paper + theme light/dark       │
└───────────────┬──────────────────────────────────────┘
                │  HTTPS + Supabase anon key
                ▼
┌──────────────────────────────────────────────────────┐
│ Supabase (free tier)                                 │
│                                                      │
│  Postgres ── RLS per role (lihat 0002_rls.sql)       │
│    profiles, subjects, materials, modules,           │
│    questions, module_assignments, attempts,          │
│    attempt_answers, question_stats, scoring_config,  │
│    reading_progress                                  │
│                                                      │
│    view student_questions ── soal TANPA kunci         │
│                                                      │
│  Storage ── bucket 'materials' (PDF, maks 10 MB)     │
│                                                      │
│  Edge Functions (Deno, TypeScript)                   │
│    process-material  ── PDF → Gemini → draft modul   │
│    regenerate-section── regenerasi bagian modul      │
│    submit-attempt    ── nilai jawaban di server      │
│    recalculate-scores── hitung bobot IRT Level 1     │
│    create-student    ── guru buat akun murid         │
└───────────────┬──────────────────────────────────────┘
                │  (hanya dari Edge Function)
                ▼
┌──────────────────────────────────────────────────────┐
│ Google Gemini API (free tier)                        │
│   - Structured output (JSON schema)                  │
│   - Input PDF langsung                               │
└──────────────────────────────────────────────────────┘
```

## Alur Data Utama

### 1. Materi → Modul (Fase 2 & 5)
```
Guru input manual / upload PDF
   ↓
materials.status: draft → ai_processing → needs_review
   ↓ (PDF: Edge Function process-material + Gemini)
modules (draft) + questions (pretest/posttest/example)
   ↓
Guru review + edit (layar Review)
   ↓ publish
modules.status = published, published_at = now()
   ↓
module_assignments (modul ditugaskan ke murid pilihan)
```

### 2. Belajar Murid (Fase 2 & 3)
```
Murid lihat modul published + ditugaskan
   ↓
pre-test (sekali) ── attempts(phase=pretest, status=submitted)
   ↓
baca modul ── reading_progress.completed = true
   ↓ (post-test terkunci sampai modul selesai)
post-test (batas percobaan default 1)
   ↓ Edge Function submit-attempt
nilai di server (client tidak pernah lihat kunci)
   ↓
skor mentah + skor terbobot + gain (post − pre)
```

### 3. Skoring IRT/Katrol (Fase 4)
```
attempt_answers (setiap submit)
   ↓
question_stats: n_responses, n_correct
   ↓ Edge Function recalculate-scores
p_smooth = (benar + k·prior) / (n + k)
b_i       = ln((1−p)/p)
w_i       = clamp(1 + α·b_i, 0.5, 2.0)
   ↓
skor terbobot = 100 · Σ(w_i·benar_i) / Σ(w_i)
```

## Keputusan Desain

### Penilaian di server, bukan client
`submit-attempt` menerima jawaban, membandingkan dengan `correct_answer` yang
hanya bisa dibaca oleh service role (atau policy guru), lalu menyimpan
`is_correct` + skor. **Client tidak pernah menerima kunci jawaban** sebelum
attempt berstatus `submitted`. Ini memenuhi syarat RLS §6 dan mencegah murid
membaca jawaban dengan inspeksi traffic.

### View `student_questions`
RLS Postgres membatasi **baris**, bukan **kolom**. Agar murid bisa membaca soal
tanpa membaca `correct_answer`/`explanation`, dibuat view yang memilih kolom amun
saja (`stem`, `options`, `type`, `topic_tag`) dengan filter modul published +
ditugaskan.

### Skala kecil = kesederhanaan
- 1 project Supabase, tidak perlu mikroserpis/queue/cache (§2).
- TanStack Query cukup untuk fetching; Zustand hanya untuk state auth ringan.
- Snapshot `weights_snapshot` disimpan per attempt agar riwayat skor tidak
  berubah diam-diam saat kalibrasi ulang (§5.5).

## Skenario Uji RLS (manual)

Jalankan di Supabase **SQL Editor** dengan `_set_role`:

```sql
-- Sebagai murid (ganti UUID murid dari seed)
select set_config('request.jwt.claims', '{"sub":"<UUID_MURID>","role":"authenticated"}', false);
set role authenticated;

-- Harusnya MENGEMBALIKAN baris (modul published & ditugaskan):
select * from student_questions;

-- Harusnya ERROR / 0 baris:
select correct_answer from questions;           -- akses tabel asli ditolak
select * from profiles;                          -- hanya baris sendiri
select * from question_stats;                    -- hanya guru
```

```sql
-- Reset
reset role;
```

Uji serupa sebagai teacher harus mengembalikan semua data.
