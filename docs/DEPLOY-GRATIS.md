# Panduan Distribusi 100% Gratis

Semua layanan dipakai pada **free tier tanpa kartu kredit**. Batas di bawah ini
perlu **diverifikasi ulang di dokumentasi resmi** sebelum produksi karena bisa
berubah (§9 NFR).

> Tanggal verifikasi terakhir: Oktober 2025 — periksa kembali sebelum rilis.

---

## Ringkasan Batas Free Tier

| Layanan | Free tier (perkiraan) | Cara tetap di bawah batas |
|---|---|---|
| **Supabase** | 2 project gratis, 500 MB database, 1 GB storage, 50k MAU, 2 GB egress/bln, 500k Edge Function invocations/bln, 1GB-betas CPU | Hapus data lama, batasi ukuran PDF 10 MB, tidak perlu project tambahan |
| **Gemini API** | `gemini-2.0-flash` free tier: ~15 RPM, 1 juta token/menit input, 1500 request/hari | Cache hasil modul, rate-limit per guru, regenerate hanya per bagian |
| **Expo / EAS** | `eas build` gratis: 30 build iOS + 30 build Android/bln (akun personal), queue tidak prioritas | Build lokal (`expo prebuild` + Gradle) untuk unlimited |

Link resmi:
- <https://supabase.com/pricing>
- <https://ai.google.dev/pricing> (Gemini API)
- <https://expo.dev/pricing>

---

## Build & Distribusi Android

### Opsi A — EAS Build (gratis, paling mudah)
```bash
npm install -g eas-cli
eas login                # buat akun Expo gratis
eas build:configure      # buat eas.json
eas build --platform android --profile preview
```
Hasil: URL unduh `.apk` → bagikan langsung ke murid (sideload). Tidak perlu
Play Store.

**Batas:** 30 build Android/bulan akun personal, queue tidak prioritas (bisa
menit hingga jam).

### Opsi B — Build lokal (unlimited, butuh Android Studio)
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
APK ada di `android/app/build/outputs/apk/release/`.

### Opsi C — Expo Go (paling cepat untuk testing)
```bash
npm start
```
Pindai QR code. **Batasan:** Expo Go adalah dev-client, tidak untuk distribusi
final; tidak mendukung semua modul native. Cocok untuk fase pengembangan.

### Pemasangan di perangkat murid
1. Salin file `.apk` ke HP murid (USB / WhatsApp / Drive).
2. Aktifkan **"Install from unknown sources"** di pengaturan Android.
3. Buka file `.apk` → install → login dengan akun murid.

---

## Opsi iOS — Hati-hati, HAMPIR MUSTAHIL 100% GRATIS

**Pernyataan jujur (§13.5):** distribusi iOS sulit dilakukan tanpa biaya:

| Opsi | Biaya | Batasan |
|---|---|---|
| **Expo Go** | Gratis | Hanya untuk development/testing; bukan distribusi final |
| **TestFlight** | Butuh **Apple Developer Program $99/tahun** | Wajib kartu kredit; hanya 90 hari/install |
| **Ad-hoc sideload** | Butuh akun Apple Developer $99/thn | Maks 100 perangkat, sertifikat harus diperbarui |
| **Bisnis Enterprise** | $299/thn | Tidak relevan untuk skala kecil |

**Rekomendasi:** untuk skala 8-9 murid di mana semuanya bisa pakai Android,
gunakan **Android + APK sideload**. Jika ada murid yang hanya punya iPhone,
opsi realistis gratisnya hanyalah **Expo Go** dengan komputer guru menyala
sebagai dev server — ini hanya cocok untuk pengujian, bukan penggunaan harian.

Apple memang mengharuskan biaya tahunan untuk distribusi aplikasi di luar App
Store. **Tidak ada cara resmi untuk menghindari ini.**

---

## Tips Tetap di Free Tier

1. **Batasi upload PDF**: maks 10 MB, ±30 halaman (konfigurasi di client).
2. **Rate-limit AI per guru**: throttle di Edge Function `process-material`.
3. **Cache**: modul yang sudah digenerate disimpan sebagai draft; regenerasi
   hanya per bagian (`regenerate-section`), bukan seluruh modul.
4. **Hapus data lama**: arsip materi yang tidak dipakai, soft-delete efektif.
5. **Monitoring**: cek usage di dashboard Supabase setiap minggu.
6. **Session handling**: token disimpan di AsyncStorage (gratis, lokal).

---

## Estimasi Konsumsi (9 murid)

- **Edge Function invocations**: setiap submit tes = 1 invocation. 9 murid ×
  ~10 modul × 2 tes = **~180 invocations/semester** — jauh di bawah 500k/bln.
- **Database storage**: skema kecil, ~50 modul × isi modul ≈ **< 20 MB**.
- **Storage**: 10 PDF × 10 MB = **100 MB** dari 1 GB.
- **Gemini**: 10 PDF/bulan × ~30k token = **~300k token/bulan** — di dalam free tier.

**Kesimpulan:** untuk skala 1 guru + 9 murid, free tier lebih dari cukup.
