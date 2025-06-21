# CAM-Backend ( Cah Apik Messenger )

<p align="center">
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm"/>
  <img style="margin-right: 8px;" src="https://img.shields.io/badge/Visual_Studio_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white" alt="Visual Studio Code"/>
</p>

CAM-Backend adalah server backend untuk aplikasi pesan real-time. Dibangun dengan Node.js, Express, dan TypeScript, serta menggunakan Socket.IO untuk komunikasi dua arah secara real-time dan MySQL untuk penyimpanan data.

## ✨ Fitur

* **Autentikasi Pengguna**: Sistem registrasi dan login yang aman.
* **Keamanan Kata Sandi**: Hashing kata sandi menggunakan `bcrypt` untuk keamanan.
* **Pesan Real-Time**: Komunikasi instan antar klien menggunakan WebSockets dengan `Socket.IO`.
* **Penyimpanan Pesan**: Riwayat obrolan disimpan secara persisten di database MySQL.
* **Konfigurasi Fleksibel**: Pengaturan server dan database dikelola melalui variabel lingkungan (`.env`).
* **CORS Support**: Konfigurasi CORS untuk mengizinkan koneksi dari berbagai domain frontend.

## 🛠️ Teknologi yang Digunakan

* **Backend**: Node.js, Express.js
* **Bahasa**: TypeScript
* **Database**: MySQL
* **Real-time Communication**: Socket.IO
* **Dependencies**:
    * `mysql2`: Klien MySQL untuk Node.js.
    * `bcrypt`: Library untuk hashing kata sandi.
    * `uuid`: Untuk membuat ID unik.
    * `cors`: Middleware untuk mengaktifkan Cross-Origin Resource Sharing.
    * `dotenv`: Untuk memuat variabel lingkungan dari file `.env`.

## 🚀 Memulai

### Prasyarat

Pastikan Anda telah menginstal perangkat lunak berikut:
* [Node.js](https://nodejs.org/) (versi 18 atau lebih tinggi direkomendasikan)
* [npm](https://www.npmjs.com/get-npm) (biasanya terinstal bersama Node.js)
* Server [MySQL](https://www.mysql.com/downloads/)

### Instalasi & Konfigurasi

1.  **Clone repositori ini:**
    ```bash
    git clone <URL_REPOSITORI_ANDA>
    cd CAM-Backend
    ```

2.  **Instal dependensi proyek:**
    ```bash
    npm install
    ```

3.  **Buat file `.env`:**
    Buat file bernama `.env` di direktori utama proyek dan salin konten dari contoh di bawah. File ini digunakan untuk menyimpan kredensial dan konfigurasi sensitif.

    ```dotenv
    # Server Configuration
    PORT=3001

    # Database Configuration
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=password_database_anda
    DB_DATABASE=nama_database_anda
    DB_PORT=3306

    # Security & CORS
    # Daftar domain yang diizinkan (pisahkan dengan koma jika lebih dari satu)
    CORS_ORIGIN=http://localhost:3000,http://localhost:5173
    # Kode otentikasi kustom untuk registrasi
    AUTH_CODE=kode_rahasia_anda
    ```

4.  **Setup Database:**
    * Pastikan server MySQL Anda berjalan.
    * Buat database baru sesuai dengan nama yang Anda masukkan di `DB_DATABASE` pada file `.env`.
    * Tabel `users` dan `messages` akan dibuat secara otomatis saat server pertama kali dijalankan.

### Menjalankan Aplikasi

* **Mode Pengembangan (dengan hot-reload):**
    Script ini menggunakan `nodemon` untuk secara otomatis me-restart server setiap kali ada perubahan file.
    ```bash
    npm run dev
    ```

* **Mode Produksi:**
    ```bash
    npm start
    ```

Server akan berjalan di alamat `http://localhost:` sesuai dengan `PORT` yang Anda tentukan di file `.env`.

## 📝 API Endpoints

Server menyediakan endpoint RESTful berikut untuk manajemen pengguna.

### `POST /register`
Mendaftarkan pengguna baru.

* **Request Body**:
    ```json
    {
      "username": "user_baru",
      "email": "user@example.com",
      "password": "password_aman",
      "authCode": "kode_rahasia_anda"
    }
    ```
* **Success Response (201 Created)**:
    ```json
    {
      "message": "Pendaftaran berhasil",
      "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "username": "user_baru"
    }
    ```
* **Error Responses**:
    * `400 Bad Request`: Jika `username`, `email`, atau `password` tidak diisi.
    * `403 Forbidden`: Jika `authCode` salah.
    * `409 Conflict`: Jika `username` atau `email` sudah terdaftar.
    * `500 Internal Server Error`: Jika terjadi kesalahan di server.

### `POST /login`
Login pengguna yang sudah ada.

* **Request Body**:
    ```json
    {
      "username": "user_baru",
      "password": "password_aman"
    }
    ```
* **Success Response (200 OK)**:
    ```json
    {
      "message": "Login berhasil",
      "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "username": "user_baru"
    }
    ```
* **Error Responses**:
    * `400 Bad Request`: Jika `username` atau `password` tidak diisi.
    * `401 Unauthorized`: Jika `password` salah.
    * `404 Not Found`: Jika `username` tidak ditemukan.
    * `500 Internal Server Error`: Jika terjadi kesalahan di server.


## 🔌 Event Socket.IO

Socket.IO digunakan untuk komunikasi real-time.

### Event dari Klien ke Server

* **`joinRoom({ userId: string })`**:
    Klien mengirimkan event ini setelah berhasil login untuk bergabung ke dalam "room" pribadinya dan mulai menerima pesan. Server akan mengirimkan riwayat pesan awal setelah join berhasil.

* **`leaveRoom({ userId: string })`**:
    Klien mengirimkan event ini untuk keluar dari room (misalnya saat logout).

* **`sendMessage(messageData, ack)`**:
    Mengirim pesan baru ke server.
    * `messageData` (objek): `{ userId: string, username: string, text: string }`
    * `ack` (fungsi callback): Fungsi yang dipanggil oleh server untuk memberi konfirmasi bahwa pesan telah diterima dan diproses. Mengembalikan `{ success: boolean, message?: object, error?: string }`.

### Event dari Server ke Klien

* **`initialMessages(messages: Array<object>)`**:
    Dikirim ke klien setelah `joinRoom` berhasil. Berisi array riwayat pesan yang diurutkan berdasarkan waktu.

* **`message(message: object)`**:
    Di-broadcast ke semua klien yang terhubung saat ada pesan baru masuk. Objek `message` memiliki format: `{ id, userId, username, text, timestamp }`.

* **`serverError(error: string)`**:
    Dikirim jika terjadi kesalahan di server saat klien mencoba mengambil data (misalnya, riwayat pesan).

## 🗄️ Skema Database

Server secara otomatis membuat dua tabel berikut jika belum ada.

### Tabel `users`
Menyimpan informasi pengguna.
```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
