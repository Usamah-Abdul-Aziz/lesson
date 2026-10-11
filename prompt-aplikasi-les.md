# PROMPT: Bangun Aplikasi Mobile "Les App" (Guru & Murid)

> Salin seluruh isi file ini ke AI coding assistant (Claude Code, Cursor, dll.). Kerjakan **per fase** sesuai bagian 12, dan **berhenti untuk konfirmasi** di akhir tiap fase.

---

## 1. Peran & Tujuan

Kamu adalah **senior mobile engineer + backend engineer** yang berpengalaman membangun aplikasi edukasi. Bangun aplikasi mobile lengkap bernama **Les App** untuk kebutuhan les privat/kelompok kecil.

**Tujuan produk:**
Guru dapat membuat materi (manual atau dari PDF), aplikasi membuatkan modul belajar + contoh soal dengan bantuan AI, guru mereview lalu mempublikasikan, murid belajar per modul dengan **pre-test** dan **post-test**, dan nilai dihitung dengan **sistem penilaian berbasis IRT/katrol** (soal yang jarang dijawab benar bernilai lebih tinggi).

## 2. Konteks & Batasan Penting

| Aspek | Ketentuan |
|---|---|
| Jumlah pengguna | **1 guru** dan **8-9 murid** (skala sangat kecil) |
| Mata pelajaran | **Matematika** dan **Bahasa Inggris** |
| Platform | Mobile (Android prioritas utama; iOS opsional jika tetap gratis) |
| Biaya | **WAJIB 100% gratis** selama pengembangan dan operasional. Hanya gunakan free tier. Dilarang memakai layanan yang butuh kartu kredit/berbayar. |
| Bahasa UI | Bahasa Indonesia (konten materi Bahasa Inggris tetap dalam bahasa Inggris) |
| Backend | **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, Row Level Security) |
| AI | **Google Gemini API free tier** (dipanggil **hanya dari Edge Function**, API key tidak boleh ada di aplikasi mobile) |

Karena skala sangat kecil, **jangan over-engineer**: tidak perlu microservices, queue terpisah, caching kompleks, atau CI/CD rumit.

## 3. Tech Stack (WAJIB diikuti)

- **Mobile:** React Native + **Expo** (SDK terbaru, managed workflow) + **TypeScript** (strict)
- **Navigasi:** Expo Router
- **State & data fetching:** TanStack Query + Zustand (hanya bila perlu)
- **Form & validasi:** React Hook Form + Zod
- **UI:** komponen sendiri sederhana atau React Native Paper (pilih salah satu, konsisten)
- **Render matematika:** react-native-katex atau WebView KaTeX (soal matematika memakai notasi LaTeX)
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions berbasis Deno/TypeScript)
- **Ekstraksi PDF:** kirim PDF langsung ke Gemini (mendukung input PDF), dengan fallback ekstraksi teks di Edge Function
- **Distribusi gratis:** build APK via **EAS Build free tier** atau build lokal, bagikan APK langsung ke murid (sideload). Jelaskan opsi iOS (Expo Go / TestFlight) beserta batasannya dan biayanya secara jujur.

> Jika menurutmu ada pilihan yang lebih baik dalam batasan gratis, **jelaskan alasannya dulu** sebelum menyimpang.

## 4. Peran Pengguna & Hak Akses

### 4.1 Guru (1 akun, role `teacher`)
- Login email + password
- CRUD **materi** (Matematika / Bahasa Inggris)
- Input materi **manual** atau **upload PDF**
- Meninjau, mengedit, dan **mempublikasikan** modul hasil AI
- CRUD **soal** (manual maupun hasil AI), termasuk pre-test & post-test
- Mengelola murid (tambah/nonaktifkan akun murid, atur akses modul)
- Melihat **dashboard** progres & nilai seluruh murid, analisis butir soal (tingkat kesulitan)

### 4.2 Murid (8-9 akun, role `student`)
- Login (akun dibuat oleh guru; tidak ada registrasi publik)
- Melihat daftar modul yang **dipublikasikan & ditugaskan** ke dirinya
- Mengerjakan **pre-test → membaca modul → mengerjakan post-test**
- Melihat nilai, riwayat, dan peningkatan (post vs pre)

## 5. Fitur Detail

### 5.1 Manajemen Materi (Guru)
1. Buat materi: judul, mata pelajaran, jenjang/kelas, deskripsi, tag.
2. Dua cara input:
   - **Manual:** editor teks sederhana (mendukung heading, list, gambar opsional, rumus LaTeX).
   - **Upload PDF:** simpan ke Supabase Storage, lalu proses (lihat 5.2).
3. Edit, hapus (soft delete), arsipkan materi.
4. Status materi: `draft` → `ai_processing` → `needs_review` → `published` → `archived`.

### 5.2 Pipeline PDF → Modul (AI + review guru)
1. Guru upload PDF (batasi **maks. 10 MB** dan ± 30 halaman agar aman di free tier).
2. Client memanggil Edge Function `process-material`.
3. Edge Function:
   - mengambil PDF dari Storage,
   - memanggil Gemini dengan **structured output (JSON schema)**,
   - memvalidasi hasil dengan Zod, menyimpan sebagai **draft**,
   - menangani error/rate-limit (retry dengan exponential backoff, pesan jelas ke guru).
4. Output AI yang harus dihasilkan (satu PDF bisa menjadi **beberapa modul**, satu modul per sub-materi/bab):
   - `title`, `summary`, `learning_objectives[]`
   - `content_blocks[]` (penjelasan bertahap, contoh, tips)
   - `worked_examples[]` (contoh soal **beserta pembahasan langkah demi langkah**)
   - `pretest_questions[]` dan `posttest_questions[]` (setara tingkat kesulitan, **tidak identik**)
   - tiap soal: `type`, `stem`, `options[]`, `correct_answer`, `explanation`, `estimated_difficulty` (1-5), `topic_tag`
5. Guru masuk layar **Review**: bisa edit semua field, hapus/tambah soal, regenerate per bagian, lalu **Publish**. Murid **tidak boleh** melihat draft.
6. Simpan juga `source_material_id` agar jejak asal modul jelas.

**Prompt AI (tulis di Edge Function, bagian system prompt):**
- Jawab **hanya berdasarkan isi PDF**; jangan mengarang fakta di luar materi.
- Soal matematika: gunakan LaTeX (`$...$`), pastikan jawaban benar dapat diverifikasi.
- Soal Bahasa Inggris: variasikan grammar, vocabulary, reading comprehension sesuai materi.
- Distribusi kesulitan: ± 30% mudah, 50% sedang, 20% sulit.
- Keluaran **hanya JSON valid** sesuai schema (tanpa markdown/teks tambahan).
- Pilihan ganda: 4 opsi, tepat 1 benar, distraktor masuk akal.

### 5.3 Modul Belajar (Murid)
- Daftar modul per mata pelajaran, dengan status: belum mulai / pre-test selesai / belajar / post-test selesai.
- Alur wajib: **Pre-test → Materi/Modul → Post-test** (post-test terkunci sampai modul dibaca; pre-test hanya boleh **sekali**, post-test boleh batas percobaan yang diatur guru, default 1).
- Halaman modul: tujuan belajar, konten, contoh soal + pembahasan, progres membaca.

### 5.4 Pre-test & Post-test
- Tiap murid mengerjakan sendiri-sendiri; jawaban dan skor tersimpan per murid per modul.
- Soal diacak urutannya (dan opsi), timer opsional per tes.
- Autosave jawaban (agar tidak hilang bila koneksi putus / aplikasi tertutup).
- Tipe soal yang didukung: pilihan ganda, benar/salah, isian singkat (jawaban dicocokkan setelah normalisasi; untuk matematika izinkan beberapa bentuk setara bila memungkinkan).
- Setelah submit: tampilkan skor, jawaban benar, pembahasan, dan **peningkatan (gain) = post − pre**.

### 5.5 Penilaian IRT / "Katrol" (INTI APLIKASI)

**Tujuan:** soal yang banyak dijawab benar oleh murid lain **bobotnya kecil**; soal yang jarang dijawab benar **bobotnya besar**.

> ⚠️ **Catatan statistik penting:** dengan hanya 8-9 murid, kalibrasi IRT penuh (2PL/3PL) **tidak stabil secara statistik**. Maka implementasikan secara bertingkat seperti di bawah, dan **jelaskan batasan ini di dokumentasi**.

**Level 1 (WAJIB, default): Bobot kesulitan empiris (katrol sederhana)**
- Untuk tiap soal *i* dari murid yang sudah menjawab: `p_i` = proporsi murid menjawab benar (dengan *smoothing*).
- Gunakan prior dari `estimated_difficulty` AI/guru agar stabil saat data sedikit:
  - `p_i_smooth = (benar_i + k * p_prior_i) / (n_i + k)`, dengan `k = 3` (dapat dikonfigurasi), `p_prior_i` diturunkan dari `estimated_difficulty` (mis. kesulitan 1→0.9, 3→0.5, 5→0.2).
- Tingkat kesulitan logit: `b_i = ln((1 − p_i_smooth) / p_i_smooth)`
- Bobot soal: `w_i = clamp(1 + α * b_i, w_min, w_max)` dengan `α = 0.5`, `w_min = 0.5`, `w_max = 2.0` (konfigurasi di tabel `scoring_config`).
- **Skor murid (0-100)** = `100 × Σ(w_i · benar_i) / Σ(w_i)` untuk soal pada tes tersebut.

**Level 2 (Opsional/Fase lanjut): Model Rasch (1PL)**
- Estimasi kemampuan murid `θ_j` dan kesulitan soal `b_i` dengan `P(benar) = 1 / (1 + e^{−(θ_j − b_i)})`.
- Estimasi memakai iterasi sederhana (JMLE/Newton-Raphson) dengan **regularisasi (prior normal)** agar stabil pada data kecil.
- Konversi `θ` ke skala 0-100 (mis. `50 + 10·θ`, dibatasi 0-100).
- Aktifkan hanya bila data cukup (mis. ≥ 30 respon per soal diperoleh dari akumulasi beberapa periode); jika tidak, otomatis kembali ke Level 1.
- Perhitungan dijalankan di **Edge Function** (`recalculate-scores`), terjadwal manual/otomatis setelah ada submit baru.

**Aturan tambahan:**
- Tampilkan **skor mentah** (jumlah benar) **dan skor terbobot** agar transparan.
- Saat jumlah murid yang menjawab satu soal masih < 3, pakai prior (Level 1 dengan prior dominan) dan tandai soal "kalibrasi awal".
- Guru dapat melihat tabel **analisis butir soal**: `n`, `p`, `b`, bobot, daya beda sederhana (korelasi item-total bila memungkinkan).
- Skor pre-test dan post-test dihitung dengan skema yang sama; hitung ulang otomatis ketika data soal bertambah, dan simpan **snapshot** skor saat tes disubmit (riwayat tidak berubah diam-diam; tampilkan juga "skor terkini" bila dikalibrasi ulang).
- Sertakan **unit test** untuk fungsi perhitungan (kasus: semua benar, semua salah, data sedikit, soal ber-p ekstrem).

### 5.6 Dashboard Guru
- Ringkasan: jumlah murid aktif, modul terpublikasi, rata-rata skor pre vs post.
- Per murid: riwayat modul, skor, gain, grafik progres.
- Per modul: distribusi nilai, soal tersulit/termudah.
- Ekspor rekap (CSV) opsional.

### 5.7 Dashboard Murid
- Modul berikutnya, progres, skor terakhir, grafik peningkatan sederhana.

## 6. Skema Database (PostgreSQL / Supabase)

Buat migrasi SQL (`supabase/migrations/`). Minimal tabel berikut (tambahkan index & constraint yang masuk akal):

```sql
-- profiles: 1 baris per user auth
profiles (id uuid pk references auth.users, full_name text, role text check (role in ('teacher','student')), is_active bool default true, created_at timestamptz)

subjects (id uuid pk, name text unique)  -- 'Matematika', 'Bahasa Inggris'

materials (id uuid pk, subject_id fk, title text, description text, grade_level text,
           source_type text check (source_type in ('manual','pdf')), pdf_path text,
           status text check (status in ('draft','ai_processing','needs_review','published','archived')),
           created_by fk profiles, created_at, updated_at, deleted_at)

modules (id uuid pk, material_id fk, title text, summary text, objectives jsonb,
         content jsonb,            -- content_blocks + worked_examples
         order_index int, status text, published_at timestamptz)

questions (id uuid pk, module_id fk, phase text check (phase in ('pretest','posttest','example')),
           type text check (type in ('mcq','true_false','short_answer')),
           stem text, options jsonb, correct_answer jsonb, explanation text,
           estimated_difficulty int check (estimated_difficulty between 1 and 5),
           topic_tag text, is_active bool default true)

module_assignments (id uuid pk, module_id fk, student_id fk, assigned_at, unique(module_id, student_id))

attempts (id uuid pk, module_id fk, student_id fk, phase text check (phase in ('pretest','posttest')),
          status text check (status in ('in_progress','submitted')), started_at, submitted_at,
          raw_score numeric, weighted_score numeric, weights_snapshot jsonb)

attempt_answers (id uuid pk, attempt_id fk, question_id fk, answer jsonb, is_correct bool, answered_at)

question_stats (question_id pk fk, n_responses int, n_correct int, p_smooth numeric,
                difficulty_b numeric, weight numeric, calibration_level int, updated_at)

scoring_config (id int pk default 1, alpha numeric, w_min numeric, w_max numeric, smoothing_k int, rasch_enabled bool)

reading_progress (module_id fk, student_id fk, percent int, completed bool, primary key (module_id, student_id))
```

### Row Level Security (WAJIB)
- Aktifkan RLS di **semua** tabel.
- **Murid:** hanya boleh `SELECT` modul `published` yang ditugaskan padanya; hanya boleh `INSERT/UPDATE` `attempts`/`attempt_answers` miliknya sendiri; **tidak boleh** membaca `correct_answer`/`explanation` soal sebelum attempt `submitted` (gunakan view/RPC/Edge Function untuk penilaian di sisi server, **jangan menilai di client**).
- **Guru:** akses penuh ke data miliknya.
- Tulis kebijakan sebagai SQL dan sertakan **tes RLS** sederhana.

## 7. Edge Functions

| Function | Fungsi |
|---|---|
| `process-material` | PDF → Gemini → draft modul + soal (validasi Zod) |
| `regenerate-section` | Regenerasi bagian tertentu (mis. soal pre-test) atas permintaan guru |
| `submit-attempt` | Menerima jawaban, menilai di server, menyimpan skor, memicu rekalkulasi statistik |
| `recalculate-scores` | Menghitung ulang `question_stats` & bobot (Level 1; Level 2 opsional) |
| `create-student` | Guru membuat akun murid (memakai service role, divalidasi role guru) |

Semua secret (Gemini key, service role) disimpan via **Supabase secrets**, bukan di repo/aplikasi.

## 8. Struktur Proyek yang Diharapkan

```
les-app/
├─ app/                      # Expo Router
│  ├─ (auth)/login.tsx
│  ├─ (teacher)/             # dashboard, materials, review, students, analytics
│  └─ (student)/             # home, modules, test, result
├─ src/
│  ├─ components/  hooks/  lib/supabase.ts  schemas/  utils/scoring/
├─ supabase/
│  ├─ migrations/  functions/  seed.sql
├─ docs/  (README, ARCHITECTURE, SCORING, DEPLOY-GRATIS)
└─ __tests__/
```

## 9. Persyaratan Non-Fungsional

- **Gratis total:** cantumkan batas free tier Supabase/Gemini/Expo dan cara tetap di bawah batas (mis. batasi ukuran PDF, throttle pemanggilan AI, cache hasil). **Verifikasi batas terbaru di dokumentasi resmi masing-masing** karena dapat berubah.
- **Keamanan:** RLS, validasi input (Zod di client & server), tidak ada secret di client, rate limit pemanggilan AI per guru.
- **UX:** UI sederhana, ramah murid, loading/empty/error state di semua layar, mendukung layar kecil.
- **Offline-tolerant ringan:** autosave jawaban lokal dan sinkron ulang saat online.
- **Aksesibilitas:** ukuran font cukup, kontras baik.
- **Kualitas kode:** TypeScript strict, ESLint + Prettier, komponen kecil dan reusable, tanpa `any` tanpa alasan.
- **Dokumentasi:** README langkah setup dari nol (akun Supabase, Gemini key, env, migrasi, build APK).

## 10. Penanganan Error & Edge Case

- PDF hasil scan/gambar (tanpa teks) → beri peringatan jelas; coba OCR via Gemini bila memungkinkan.
- AI mengembalikan JSON tidak valid → retry terbatas, lalu tampilkan error yang bisa ditindaklanjuti guru.
- Rate limit AI habis → tampilkan antrean/pesan coba lagi, jangan crash.
- Murid keluar di tengah tes → lanjutkan dari autosave; timer berdasarkan waktu server.
- Soal diedit/dihapus setelah ada jawaban → jangan merusak riwayat (gunakan `is_active` dan snapshot).
- Murid dinonaktifkan → tidak bisa login, data tetap tersimpan.

## 11. Data Seed & Pengujian

- `seed.sql`: 1 guru, 9 murid dummy, 2 mata pelajaran, 2 modul contoh (1 Matematika, 1 B. Inggris) lengkap dengan soal.
- Unit test: fungsi skoring, validasi schema AI, normalisasi jawaban isian.
- Skenario uji manual (checklist) untuk alur guru dan murid end-to-end.

## 12. Rencana Fase Pengerjaan

1. **Fase 1 - Fondasi:** setup Expo + Supabase, auth & role, skema DB + RLS, seed.
2. **Fase 2 - Materi & Modul manual:** CRUD materi/modul/soal oleh guru, tampilan modul untuk murid (termasuk KaTeX).
3. **Fase 3 - Tes:** alur pre-test → modul → post-test, penilaian di server, hasil & pembahasan.
4. **Fase 4 - Skoring IRT/Katrol:** `question_stats`, bobot Level 1, tabel analisis butir, unit test.
5. **Fase 5 - AI dari PDF:** `process-material`, layar review & publish guru, regenerate.
6. **Fase 6 - Dashboard & polish:** dashboard guru/murid, ekspor CSV, error state, build APK, dokumentasi.
7. **(Opsional) Fase 7 - Rasch (Level 2).**

## 13. Cara Kerja yang Diminta dari Kamu (AI Coder)

1. **Mulai** dengan ringkasan arsitektur singkat dan daftar asumsi, lalu kerjakan Fase 1.
2. Setelah tiap fase: tampilkan daftar file yang dibuat/diubah, cara menjalankan, dan cara mengetes.
3. **Jangan** menambahkan fitur di luar spesifikasi tanpa bertanya; bila ada ambiguitas, ajukan pertanyaan singkat.
4. Pastikan setiap perintah/versi library yang dipakai **valid dengan versi terbaru** (cek dokumentasi resmi, jangan menebak API).
5. Jelaskan secara jujur bila ada fitur yang tidak bisa 100% gratis atau memiliki keterbatasan (mis. distribusi iOS).

## 14. Kriteria Penerimaan (Definition of Done)

- [ ] Guru dapat login, membuat materi manual dan dari PDF, mereview, dan mempublikasikan modul.
- [ ] Murid hanya melihat modul published yang ditugaskan; tidak bisa melihat kunci jawaban sebelum submit.
- [ ] Alur pre-test → modul → post-test berjalan, skor tersimpan per murid per modul.
- [ ] Skor terbobot memberi bobot lebih besar pada soal yang lebih jarang dijawab benar (dibuktikan unit test).
- [ ] Seluruh pipeline berjalan di free tier tanpa kartu kredit.
- [ ] RLS aktif dan teruji; tidak ada secret di aplikasi mobile.
- [ ] APK dapat dibuild dan dipasang di perangkat murid; README setup lengkap.
