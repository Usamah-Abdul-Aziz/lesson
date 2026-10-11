# Checklist Pengujian Manual — Fase 1 (Fondasi)

> Jalankan setelah migrasi + seed selesai dan aplikasi berjalan (`npm start`).

## A. Setup & Database

- [ ] `npm install` selesai tanpa error fatal (warning boleh)
- [ ] `.env` diisi dengan `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `0001_init.sql` dijalankan tanpa error
- [ ] `0002_rls.sql` dijalankan tanpa error
- [ ] `seed.sql` dijalankan tanpa error
- [ ] Table Editor menampilkan 1 profile guru + 9 profile murid
- [ ] Table Editor menampilkan 2 subjects, 2 materials, 2 modules
- [ ] Tabel `questions` berisi 18 soal (10 aljabar + 8 English)
- [ ] Tabel `module_assignments` berisi 18 baris (2 modul × 9 murid)
- [ ] Dashboard Supabase → Authentication → Users menampilkan 10 user
- [ ] Dashboard Supabase → Authentication → Policies: RLS **enabled** di semua tabel

## B. Autentikasi & Role

- [ ] Aplikasi terbuka → layar **login** tampil (belum ada sesi)
- [ ] Login `guru@lesapp.test` / `password123` → diarahkan ke **(teacher)**
- [ ] Header menampilkan tombol **logout**
- [ ] Logout → kembali ke layar login
- [ ] Login `murid1@lesapp.test` / `password123` → diarahkan ke **(student)**
- [ ] Header murid menampilkan "Halo, Andi Pratama"
- [ ] Login email salah → pesan error tampil, tetap di login
- [ ] Login password salah → pesan error tampil, tetap di login
- [ ] Tutup aplikasi total, buka lagi → sesi masih ada (persist via AsyncStorage)
- [ ] Validasi form: email kosong → "Email wajib diisi"; email tanpa "@" → "Format email tidak valid"; password < 6 → "Password minimal 6 karakter"

## C. Keamanan (RLS) — PENTING

Jalankan di **Supabase SQL Editor**. Ganti `<UUID_MURID>` dengan id profile
murid dari seed (lihat Table Editor → profiles).

### C.1 Sebagai murid
```sql
-- Set context sebagai murid
select set_config('request.jwt.claims',
  json_build_object('sub', '<UUID_MURID>', 'role', 'authenticated')::text, false);
set role authenticated;
```

- [ ] `select * from student_questions;` → **mengembalikan baris** (soal modul yang ditugaskan)
- [ ] `select * from student_questions;` → kolom `correct_answer` **tidak ada** (view hanya pilih kolom aman)
- [ ] `select * from questions;` → **0 baris** (akses tabel langsung ditolak untuk murid)
- [ ] `select correct_answer from questions limit 1;` → **error/0 baris** (kunci jawaban tidak bocor)
- [ ] `select * from materials;` → **0 baris**
- [ ] `select * from question_stats;` → **0 baris** (hanya guru)
- [ ] `select * from profiles;` → hanya **1 baris** (dirinya sendiri)
- [ ] `select * from attempts;` → **0 baris** (belum ada attempt)

```sql
reset role;
```

### C.2 Sebagai guru
```sql
select set_config('request.jwt.claims',
  json_build_object('sub', '<UUID_GURU>', 'role', 'authenticated')::text, false);
set role authenticated;
```

- [ ] `select * from questions;` → **mengembalikan semua soal** termasuk `correct_answer`
- [ ] `select * from materials;` → **mengembalikan semua materi**
- [ ] `select * from question_stats;` → bisa baca (tabel ada, mungkin kosong)
- [ ] `select * from student_questions;` → **0 baris** (guru bukan murid, tidak ada assignment)

```sql
reset role;
```

### C.3 Tanpa login (anon)
- [ ] Panggil API dengan anon key tanpa token:
  `curl "<URL>/rest/v1/modules?select=*" -H "apikey: <ANON>"` → **0 baris**

## D. Unit Test

```bash
npm test
```
- [ ] Semua test di `__tests__/scoring.test.ts` lulus (katrol + normalisasi)
- [ ] `npm run typecheck` → tidak ada error TypeScript

## E. Kompatibilitas

- [ ] Aplikasi jalan di Expo Go (Android)
- [ ] Layar kecil (mis. 360px lebar) → tidak ada overflow horizontal
- [ ] Mode gelap (system dark theme) → UI tetap terbaca, kontras cukup
- [ ] Rotate ke landscape → tidak crash (portrait preferred)
