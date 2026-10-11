# Les App — Aplikasi Les Privat (Guru & Murid)

Aplikasi mobile untuk les privat/kelompok kecil (1 guru, 8-9 murid) dengan materi
belajar, pre-test/post-test, dan **sistem penilaian berbasis IRT/"katrol"** — soal
yang jarang dijawab benar mendapat bobot lebih besar.

**Stack:** React Native + Expo (TypeScript strict), Expo Router, React Native Paper,
TanStack Query, Zustand, Supabase (Postgres + RLS + Edge Functions), Gemini API.

**100% free tier** — tidak ada layanan berbayar atau kartu kredit (lihat
[docs/DEPLOY-GRATIS.md](docs/DEPLOY-GRATIS.md)).

---

## Status Pengerjaan (per fase)

| Fase | Isi | Status |
|---|---|---|
| 1 | Fondasi: setup Expo+Supabase, auth & role, skema DB + RLS, seed | ✅ Selesai |
| 2 | Materi & modul manual (CRUD guru, tampilan murid + KaTeX) | ⏳ Menyusul |
| 3 | Alur pre-test → modul → post-test + penilaian server | ⏳ |
| 4 | Skoring IRT/katrol + analisis butir soal | ⏳ (util siap) |
| 5 | AI dari PDF (process-material, review, publish) | ⏳ |
| 6 | Dashboard guru/murid, ekspor CSV, build APK | ⏳ |
| 7 | (Opsional) Model Rasch Level 2 | ⏳ |

---

## Setup dari Nol

### 1. Prasyarat
- Node.js 18+ (diuji pada Node 20/22)
- Akun gratis **Supabase** (<https://supabase.com>) — free tier, tanpa kartu kredit
- API key gratis **Google Gemini** (<https://aistudio.google.com/app/apikey>) — baru
  dipakai di Fase 5

### 2. Install dependency
```bash
npm install
```

### 3. Buat project Supabase
1. Login ke <https://supabase.com> → **New Project**.
2. Isi nama, pilih region terdekat, set database password (catat!).
3. Tunggu provisioning (~2 menit).

### 4. Ambil kredensial
Buka **Project Settings → API**:
- `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

> ⚠️ **JANGAN** gunakan `service_role` key di aplikasi mobile. Key itu hanya untuk
> Edge Functions (dipasang sebagai Supabase Secret). Anon key aman karena seluruh
> akses dilindungi RLS.

### 5. Isi file environment
```bash
cp .env.example .env
```
Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 6. Jalankan migrasi database
**Opsi A — Supabase CLI** (jika terinstall):
```bash
npx supabase init
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push          # jalankan 0001_init.sql + 0002_rls.sql
npx supabase db seed          # jalankan seed.sql
```

**Opsi B — SQL Editor** (paling sederhana, cocok untuk free tier):
1. Buka dashboard Supabase → **SQL Editor → New query**.
2. Salin seluruh isi `supabase/migrations/0001_init.sql` → **Run**.
3. Ulangi untuk `supabase/migrations/0002_rls.sql`.
4. Ulangi untuk `supabase/seed.sql`.

Verifikasi: tabel `profiles`, `modules`, `questions` muncul di **Table Editor**.

### 6b. Verifikasi RLS (penting!)
Pastikan **Authentication → Policies** menampilkan RLS **enabled** di semua tabel,
dan tidak ada policy yang mengizinkan anon/bypass. Lihat
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) untuk skenario uji RLS.

### 7. Jalankan aplikasi
```bash
npm start
```
Pindai QR code dengan **Expo Go** (Play Store), atau tekan `a` untuk emulator
Android. Karena konfigurasi `.env` dibaca saat bundle, restart Metro setelah
mengubah `.env` (tekan `shift+r` atau `npm start` lagi).

### 8. Login default (hasil seed)
| Email | Password | Role |
|---|---|---|
| `guru@lesapp.test` | `password123` | Guru |
| `murid1@lesapp.test` … `murid9@lesapp.test` | `password123` | Murid |

> Ganti password seed ini sebelum dipakai sungguhan (§9 keamanan).

---

## Struktur Proyek

```
les-app/
├─ app/                          # Expo Router
│  ├─ _layout.tsx                # Root: PaperProvider, QueryClient, fonts
│  ├─ index.tsx                  # Redirect berdasarkan sesi/role
│  ├─ (auth)/login.tsx           # Login (email + password)
│  ├─ (teacher)/index.tsx        # Beranda guru
│  └─ (student)/index.tsx        # Beranda murid
├─ src/
│  ├─ components/                # Komponen reusable
│  ├─ hooks/                     # Custom hooks
│  ├─ lib/
│  │  ├─ supabase.ts             # Client Supabase (session persisten)
│  │  └─ queryClient.ts          # TanStack Query + query keys
│  ├─ providers/AuthGate.tsx     # Listener sesi + routing role
│  ├─ stores/auth.ts             # Zustand: profil & role
│  ├─ theme/                     # Theme React Native Paper (light/dark)
│  ├─ types/database.ts          # Tipe skema DB
│  └─ utils/scoring/             # Algoritma skoring IRT Level 1 + normalisasi
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_init.sql           # Skema tabel + trigger
│  │  └─ 0002_rls.sql            # Row Level Security + view student_questions
│  └─ seed.sql                   # 1 guru, 9 murid, 2 mapel, 2 modul + soal
├─ __tests__/                    # Unit test (Jest)
├─ docs/                         # Dokumentasi
└─ .env.example                  # Template environment
```

---

## Menjalankan Test

```bash
npm test            # unit test (skoring, normalisasi)
npm run typecheck   # TypeScript strict check
npm run lint        # ESLint
```

---

## Catatan Keamanan

- **RLS aktif di semua tabel** — murid hanya bisa melihat modul published yang
  ditugaskan kepadanya.
- **Kunci jawaban tidak pernah dikirim ke client** sebelum attempt di-submit:
  murid membaca via view `student_questions` yang hanya menampilkan kolom
  `stem`, `options`, `type` (tanpa `correct_answer` & `explanation`).
- **Tidak ada secret di aplikasi** — Gemini API key & service role hanya ada di
  Supabase Secrets, diakses lewat Edge Functions (Fase 5).
- **Penilaian dilakukan di server** (`submit-attempt`, Fase 3), bukan di client.

## Catatan Statistik (§5.5)

Dengan hanya 8-9 murid, kalibrasi IRT penuh (2PL/3PL) **tidak stabil secara
statistik**. Implementasi default memakai **Level 1: bobot kesulitan empiris
dengan prior Bayesian** — stabil pada data kecil, efek "katrol" tetap terasa.
Model Rasch (Level 2) tersedia sebagai fase opsional. Detail di
[docs/SCORING.md](docs/SCORING.md).
