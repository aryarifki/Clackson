## Veo Prompt Generator

Aplikasi Next.js (App Router) untuk menghasilkan prompt JSON terstruktur dan realistis untuk Google Veo. Mendukung multi‑model (Gemini 2.5 Pro, Kimi K2 Preview, Deepseek Chat), penyimpanan riwayat, enkripsi API key, dan autentikasi custom berbasis cookie.

### Tech Stack
- Next.js 14 App Router (RSC + Server Actions)
- Tailwind CSS + utilitas mirip shadcn/ui (komponen dasar)
- Drizzle ORM + Neon Postgres
- (Dulu: Vercel Blob untuk simpan file prompt – sekarang dihapus agar dependency minimal)
- Model provider via HTTP fetch (Gemini, Kimi, Deepseek)
- Zod untuk validasi output prompt
- Custom lightweight auth (HMAC signed cookie) + middleware proteksi
- AES-256-GCM untuk enkripsi API key user

### Fitur Utama
1. Generate prompt JSON kompleks & konsisten (scene_breakdown, directives) – validasi Zod.
2. Parameter dasar (base params) diprefetch otomatis (debounced) lewat Edge Route untuk kurangi latensi awal.
3. Field audio sekarang mendukung sound_effects & background_music (backsound) terstruktur.
4. Opsi arahan dialog / tone percakapan (optional dialogue instruction) sebelum generasi variasi.
5. Global duration override (durasi detik) yang diterapkan ke semua variasi.
6. Pilihan provider & override API key per request.
7. Penyimpanan otomatis hasil (chat + messages) ke database.
8. Dashboard riwayat prompt per user.
9. Enkripsi API key milik user sebelum disimpan.
10. Prefetch + caching + timeout + abort controller untuk respons lebih cepat & reliabel.
11. (Fitur simpan prompt ke Blob & final prompt field lama sudah dihapus.)

### Struktur Direktori Ringkas
```
app/
	page.tsx                -> Halaman generator utama
	dashboard/              -> Riwayat prompt user
	auth/signin, signup     -> Halaman auth
	api/                    -> Endpoint login, signup, keys, generate
lib/
	auth.ts                 -> Custom session (cookie) & helper user
	crypto.ts               -> Enkripsi AES-256-GCM
	generationCore.ts       -> Inti panggilan model + validasi schema
	promptSchema.ts         -> Zod schema Veo prompt
	db/ (schema, client)    -> Drizzle + Neon
components/ui             -> Komponen UI kecil
```

### Skema Database (Drizzle)
Tabel: users, api_keys, chats, messages.
- users: id, email (unik), passwordHash, name
- api_keys: (userId, provider, encryptedKey)
- chats: (userId, model, title, systemStyle)
- messages: (chatId, role, content, meta JSON)

### Environment Variables
Salin `.env.example` ke `.env.local` (lokal) atau set di Vercel Dashboard.

Wajib:
- DATABASE_URL=<string Neon postgres>
- ENCRYPTION_SECRET=<string panjang acak > 32 chars>
- GEMINI_API_KEY= (opsional jika user selalu override)
- KIMI_API_KEY=
- DEEPSEEK_API_KEY=

Opsional (tidak lagi dipakai, cukup hapus jika ada):
# BLOB_READ_WRITE_TOKEN (dulu untuk @vercel/blob)

Contoh pembuatan secret kuat: `openssl rand -base64 48`

### Setup Lokal
```bash
cp .env.example .env.local
npm install
# (Opsional) Jalankan migrasi / generate schema
npx drizzle-kit generate:pg
npm run dev
```
Lalu buka http://localhost:3000

### Seed User (Manual)
Gunakan script Node sederhana / psql:
```sql
INSERT INTO users (email, password_hash, name) VALUES (
	'admin@example.com',
	'$2a$10$exampleHashGantiDenganBCryptAsli',
	'Admin'
);
```
Hash bisa dibuat dengan:
```bash
node -e "console.log(require('bcryptjs').hashSync('passwordAnda',10))"
```

### Alur Autentikasi Custom
1. POST /api/signup -> buat user (email unik, bcrypt hash)
2. POST /api/login -> verifikasi bcrypt, set cookie `session` (HMAC tanda tangan)
3. Middleware cek cookie untuk akses /dashboard & /api/keys
4. DELETE /api/login -> hapus cookie (logout)

Cookie berisi payload base64url + signature HMAC SHA-256 dengan ENCRYPTION_SECRET.

### Generate Prompt
Halaman utama memakai alur: core idea -> (prefetch base params) -> edit -> konfirmasi -> optional dialog -> sequential generate.

Perubahan terbaru: final prompt field lama dihapus; sekarang fokus pada variasi per item serta dukungan backsound & dialog.

Alur aktif (detail):
1. User isi core idea (textarea). Sistem melakukan debounce (700ms) lalu memanggil Edge Route `/api/prepare-base` untuk prefetch base params (low latency runtime). AbortController digunakan jika user mengetik lagi sebelum selesai.
2. Jika user klik "Buat Parameter Dasar" atau prefetch selesai, parameter dasar tampil dan bisa diedit (semua sub‑field termasuk background_music & sound_effects).
3. User tentukan jumlah output (1–10) & global duration override (detik). Durasi otomatis dinormalisasi, disimpan dengan sufiks `s`.
4. Konfirmasi: user memilih apakah ingin menambahkan arahan dialog. Jika ya, masuk layar input dialog (tone / hint percakapan) sebelum generate.
5. Generate sequential: Tiap klik menghasilkan 1 variasi lewat `generateSingleComplexPromptAction`. Base params dan optional dialogueInstruction disisipkan dalam prompt builder.
6. Setiap variasi dapat diedit (negative prompts, dialogue, parameter teknis) dan dicopy sebagai JSON.
7. Selesai ketika jumlah target tercapai.

### API Endpoints (Ringkas)
- POST /api/login { email, password }
- DELETE /api/login (logout)
- POST /api/signup { email, password, name }
- POST /api/keys { provider, key } (butuh sesi) -> simpan terenkripsi
- GET /api/keys (butuh sesi) -> daftar key (masked)
- POST /api/generate (alternatif API; gunakan provider + input)
- GET /api/prepare-base?provider=&coreIdea= (Edge, prefetch base params; cached + timeout)

### Enkripsi API Key
`lib/crypto.ts` menggunakan AES-256-GCM: format: salt.iv.tag.cipher (base64). Kunci derivasi scrypt.

### Deployment ke Vercel
1. Push repo ke GitHub.
2. Buat Project Vercel -> Import repo.
3. Set Environment Variables (Production & Preview):
	 - DATABASE_URL
	 - ENCRYPTION_SECRET
	 - GEMINI_API_KEY / KIMI_API_KEY / DEEPSEEK_API_KEY (jika ingin default)
	 - BLOB_READ_WRITE_TOKEN (jika pakai blob)
4. Jalankan sekali migrasi (opsi): gunakan Drizzle push lokal lalu commit SQL/migration, atau jalankan manual di Neon.
5. Deploy.

### Praktik Keamanan Disarankan (Next Steps)
- Tambah rate limiting (login, generate) via middleware atau provider eksternal.
- CSRF token untuk POST auth (double submit cookie).
- Per-user salt unik tambahan untuk enkripsi (bukan hanya secret global).
- Validasi panjang password & kebijakan kompleksitas.
- Audit logging (simpan IP hashed untuk login).

### Troubleshooting
| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Build gagal terkait Edge / dynamic eval | Import next-auth (sudah dihapus) | Pastikan tidak ada sisa kode NextAuth |
| JSON prompt invalid | Model output tidak sesuai | Lihat field `error` atau `issues` pada hasil, coba regenerate |
| Tidak tersimpan ke DB | DATABASE_URL salah | Cek Neon connection string & SSL |
| Tidak login setelah signup | Hash tidak cocok | Pastikan password sama & hash benar |
| Prefetch tidak muncul "Base params siap" | Debounce belum selesai / request di-abort | Berhenti mengetik sejenak (>700ms) agar prefetch jalan |
| Background music kosong di JSON | Field belum diedit / model tidak mengisi | Isi manual di panel edit (Background Music) |
| Dialogue tidak muncul | Arahan dialog dikosongkan | Isi kembali di langkah dialog sebelum generate |

### Script NPM
- `dev` : Jalankan dev server
- `build`: Build production
- `start`: Jalankan hasil build
- `db:generate`: Generate tipe Drizzle
- `db:push`: Push schema ke DB

### Roadmap Lanjutan
- Re-introduce optional chat persistence untuk variasi kompleks
- Detail view per chat + replay prompt
- Batch export & batch generation pipeline (tanpa interaksi manual)
- Rate limiting & quotas per user
- PII scrubbing / moderation
- Integrasi penyimpanan eksternal opsional (Blob / S3) bila diperlukan
- Otomatis pilih provider tercepat (berdasar telemetry timing global)
- Panel statistik latency per provider

### Lisensi
Internal / pribadi (sesuaikan kebutuhan). Tambahkan LICENSE jika ingin open-source.

---
Siap commit & deploy. Periksa kembali ENCRYPTION_SECRET & DATABASE_URL di Vercel sebelum deploy.
