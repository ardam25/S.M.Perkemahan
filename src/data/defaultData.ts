/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peserta, Kegiatan, Kehadiran, Admin, AuditLog, AppSettings, Pengumuman, DokumenKegiatan } from '../types';

export const defaultPeserta: Peserta[] = [
  { idPeserta: "PBK001", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putra", kodeQr: "PBK001", tanggalDaftar: "2026-07-10", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK002", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putri", kodeQr: "PBK002", tanggalDaftar: "2026-07-10", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK003", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putra", kodeQr: "PBK003", tanggalDaftar: "2026-07-10", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK004", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putri", kodeQr: "PBK004", tanggalDaftar: "2026-07-10", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK005", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putra", kodeQr: "PBK005", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK006", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putri", kodeQr: "PBK006", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penggalang SMP (SMP/MTs)" },
  { idPeserta: "PBK007", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putra", kodeQr: "PBK007", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penegak (SMA/MA/SMK)" },
  { idPeserta: "PBK008", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putri", kodeQr: "PBK008", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penegak (SMA/MA/SMK)" },
  { idPeserta: "PBK009", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putra", kodeQr: "PBK009", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penegak (SMA/MA/SMK)" },
  { idPeserta: "PBK010", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putri", kodeQr: "PBK010", tanggalDaftar: "2026-07-11", statusAktif: true, tingkatan: "Penegak (SMA/MA/SMK)" },
  { idPeserta: "PBK011", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putra", kodeQr: "PBK011", tanggalDaftar: "2026-07-12", statusAktif: true, tingkatan: "Penggalang SD (SD/MI)" },
  { idPeserta: "PBK012", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putri", kodeQr: "PBK012", tanggalDaftar: "2026-07-12", statusAktif: true, tingkatan: "Penggalang SD (SD/MI)" },
];

export const defaultKegiatan: Kegiatan[] = [
  { idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", hari: "Kamis", tanggal: "2026-07-12", jamMulai: "08:00", jamSelesai: "11:30", lokasi: "Lapangan Utama Perkemahan", status: "Selesai", urutan: 1, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", hari: "Kamis", tanggal: "2026-07-12", jamMulai: "14:00", jamSelesai: "15:30", lokasi: "Lapangan Utama", status: "Selesai", urutan: 2, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", hari: "Jumat", tanggal: "2026-07-13", jamMulai: "08:00", jamSelesai: "11:00", lokasi: "Sektor Perlombaan", status: "Selesai", urutan: 3, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT004", namaKegiatan: "Lomba PBB Tingkat Penggalang", hari: "Jumat", tanggal: "2026-07-13", jamMulai: "14:00", jamSelesai: "17:00", lokasi: "Lapangan Utama", status: "Selesai", urutan: 4, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)"] },
  { idKegiatan: "KGT005", namaKegiatan: "Penjelajahan / Wide Game Pramuka", hari: "Sabtu", tanggal: "2026-07-14", jamMulai: "07:30", jamSelesai: "12:00", lokasi: "Hutan Pinus Jawi-Jawi", status: "Aktif", urutan: 5, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT006", namaKegiatan: "Upacara Api Unggun & Pentas Seni", hari: "Sabtu", tanggal: "2026-07-14", jamMulai: "19:30", jamSelesai: "23:00", lokasi: "Lapangan Utama", status: "Aktif", urutan: 6, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT007", namaKegiatan: "Senam Pagi Pramuka & Bakti Sosial", hari: "Minggu", tanggal: "2026-07-15", jamMulai: "06:00", jamSelesai: "08:30", lokasi: "Area Perkemahan", status: "Aktif", urutan: 7, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
  { idKegiatan: "KGT008", namaKegiatan: "Upacara Penutupan & Pengumuman", hari: "Minggu", tanggal: "2026-07-15", jamMulai: "10:00", jamSelesai: "12:00", lokasi: "Lapangan Utama", status: "Aktif", urutan: 8, tingkatan: ["Penggalang SD (SD/MI)", "Penggalang SMP (SMP/MTs)", "Penegak (SMA/MA/SMK)"] },
];

export const defaultKehadiran: Kehadiran[] = [
  // Registrasi & Pendirian Tenda (KGT001) - 100% hadir
  { id: "LOG001", tanggal: "2026-07-12", jam: "08:15", idPeserta: "PBK001", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG002", tanggal: "2026-07-12", jam: "08:18", idPeserta: "PBK002", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG003", tanggal: "2026-07-12", jam: "08:22", idPeserta: "PBK003", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG004", tanggal: "2026-07-12", jam: "08:25", idPeserta: "PBK004", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG005", tanggal: "2026-07-12", jam: "08:31", idPeserta: "PBK005", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG006", tanggal: "2026-07-12", jam: "08:35", idPeserta: "PBK006", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG007", tanggal: "2026-07-12", jam: "08:42", idPeserta: "PBK007", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG008", tanggal: "2026-07-12", jam: "08:45", idPeserta: "PBK008", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG009", tanggal: "2026-07-12", jam: "08:50", idPeserta: "PBK009", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG010", tanggal: "2026-07-12", jam: "08:52", idPeserta: "PBK010", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG011", tanggal: "2026-07-12", jam: "09:01", idPeserta: "PBK011", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG012", tanggal: "2026-07-12", jam: "09:10", idPeserta: "PBK012", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT001", namaKegiatan: "Registrasi & Pendirian Tenda", statusHadir: "Hadir", petugas: "Kak Ruslan" },

  // Upacara Pembukaan (KGT002) - Beberapa terlambat/tidak hadir
  { id: "LOG013", tanggal: "2026-07-12", jam: "13:50", idPeserta: "PBK001", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG014", tanggal: "2026-07-12", jam: "13:52", idPeserta: "PBK002", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG015", tanggal: "2026-07-12", jam: "13:55", idPeserta: "PBK003", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putra", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG016", tanggal: "2026-07-12", jam: "13:58", idPeserta: "PBK004", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putri", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG017", tanggal: "2026-07-12", jam: "14:02", idPeserta: "PBK005", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG018", tanggal: "2026-07-12", jam: "14:05", idPeserta: "PBK006", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG019", tanggal: "2026-07-12", jam: "14:10", idPeserta: "PBK007", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putra", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG020", tanggal: "2026-07-12", jam: "14:15", idPeserta: "PBK008", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putri", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG021", tanggal: "2026-07-12", jam: "14:18", idPeserta: "PBK009", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putra", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },
  { id: "LOG022", tanggal: "2026-07-12", jam: "14:20", idPeserta: "PBK010", namaPangkalan: "MA Syiar Islam Batulohe", jenisKelamin: "Putri", idKegiatan: "KGT002", namaKegiatan: "Upacara Pembukaan Perkemahan", statusHadir: "Hadir", petugas: "Kak Ruslan" },

  // Lomba Pionering (KGT003) - 9 peserta hadir
  { id: "LOG023", tanggal: "2026-07-13", jam: "08:05", idPeserta: "PBK001", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG024", tanggal: "2026-07-13", jam: "08:10", idPeserta: "PBK002", namaPangkalan: "SMP Negeri 1 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG025", tanggal: "2026-07-13", jam: "08:12", idPeserta: "PBK003", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putra", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG026", tanggal: "2026-07-13", jam: "08:15", idPeserta: "PBK004", namaPangkalan: "MTs Muhammadiyah Tanete", jenisKelamin: "Putri", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG027", tanggal: "2026-07-13", jam: "08:20", idPeserta: "PBK005", namaPangkalan: "SMP Negeri 18 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG028", tanggal: "2026-07-13", jam: "08:25", idPeserta: "PBK007", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putra", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG029", tanggal: "2026-07-13", jam: "08:28", idPeserta: "PBK008", namaPangkalan: "SMA Negeri 2 Bulukumba", jenisKelamin: "Putri", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG030", tanggal: "2026-07-13", jam: "08:35", idPeserta: "PBK011", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putra", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
  { id: "LOG031", tanggal: "2026-07-13", jam: "08:40", idPeserta: "PBK012", namaPangkalan: "SDN 171 Bulukumpa", jenisKelamin: "Putri", idKegiatan: "KGT003", namaKegiatan: "Lomba Pionering & Tali Temali", statusHadir: "Hadir", petugas: "Kak Hamsah" },
];

export const defaultAdmins: Admin[] = [
  { username: "admin", password: "admin123", nama: "Kak Syarifuddin (Kwarnas Ranting)", level: "Super Admin" },
  { username: "panitia", password: "panitia123", nama: "Kak Nurhaliza (Sekretaris Panitia)", level: "Panitia" },
];

export const defaultAuditLogs: AuditLog[] = [
  { id: "AUD001", timestamp: "2026-07-12 08:00:15", pengguna: "Kak Syarifuddin", aktivitas: "Sistem Dimulai", detail: "Menginisialisasi pangkalan data perkemahan Bulukumpa." },
  { id: "AUD002", timestamp: "2026-07-12 08:15:22", pengguna: "Kak Ruslan", aktivitas: "Registrasi Kehadiran", detail: "Melakukan absensi masuk peserta PBK001 di Kegiatan KGT001." },
  { id: "AUD003", timestamp: "2026-07-12 11:30:00", pengguna: "Kak Syarifuddin", aktivitas: "Pembaruan Status", detail: "Mengubah status kegiatan KGT001 (Registrasi) menjadi 'Selesai'." },
  { id: "AUD004", timestamp: "2026-07-12 13:45:10", pengguna: "Kak Syarifuddin", aktivitas: "Pembaruan Status", detail: "Mengaktifkan kegiatan KGT002 (Upacara Pembukaan)." }
];

export const defaultSettings: AppSettings = {
  namaEvent: "Perkemahan Bakti Penegak & Penggalang Kwartir Ranting Bulukumpa",
  kwartir: "Kwartir Ranting Bulukumpa, Kabupaten Bulukumba",
  darkTheme: false,
  autoRefreshInterval: 30,
  soundEnabled: true,
  speechEnabled: true,
  batchScanDelay: 2500,
  lokasiEvent: "Bumi Perkemahan Bulukumpa",
  pelaksanaEvent: "Kwartir Ranting Gerakan Pramuka Bulukumpa",
  gasUrl: "https://script.google.com/macros/s/AKfycbysCFZ7wjpw3TfCkFmcNT6nh944h_hU6tyrVey7ls0vfX3QMjS2tjg5AU768kbsZI8/exec",
  namaKetua: "Kak Ruslan, S.Pd.",
  namaSekretaris: "Kak Nurhaliza, S.E.",
  namaBendahara: "Kak Rismawati, S.Pd."
};

export const defaultAnnouncements: Pengumuman[] = [
  {
    id: "ANN001",
    judul: "Briefing Pemimpin Regu (Pinru)",
    konten: "Perhatian kepada seluruh Pemimpin Regu (Pinru) Penggalang dan Penegak, diharap segera berkumpul di Posko Utama sekarang juga untuk pengarahan teknis kegiatan penjelajahan besok pagi. Terima kasih.",
    tanggal: "2026-07-13",
    jam: "13:00",
    tingkatanTarget: "Semua",
    statusAktif: true,
    dibuatOleh: "Kak Syarifuddin (Kwarnas Ranting)"
  },
  {
    id: "ANN002",
    judul: "Pengumpulan Kayu Bakar Api Unggun",
    konten: "Kepada masing-masing pangkalan, batas waktu pengumpulan kayu bakar untuk persiapan Upacara Api Unggun malam ini diperpanjang hingga sore ini pukul 17:00 WITA. Harap segera menyetorkannya ke koordinator perlengkapan.",
    tanggal: "2026-07-13",
    jam: "15:30",
    tingkatanTarget: "Penegak (SMA/MA/SMK)",
    statusAktif: true,
    dibuatOleh: "Kak Nurhaliza (Sekretaris Panitia)"
  },
  {
    id: "ANN003",
    judul: "Kebersihan dan Penilaian Kerapian Tenda",
    konten: "Dihimbau kepada seluruh adik-adik pramuka untuk selalu menjaga kebersihan area pangkalan masing-masing. Panitia akan melakukan penilaian kebersihan dan kerapian tenda secara berkala mulai sore hari ini.",
    tanggal: "2026-07-13",
    jam: "10:00",
    tingkatanTarget: "Semua",
    statusAktif: true,
    dibuatOleh: "Kak Syarifuddin (Kwarnas Ranting)"
  }
];

export const defaultDokumenKegiatan: DokumenKegiatan[] = [
  {
    id: "DOC001",
    judul: "Petunjuk Teknis (Juknis) Pelaksanaan Perkemahan Bakti 2026",
    linkDrive: "https://drive.google.com/file/d/1example_juknis_bulukumpa/view",
    tingkatan: "Semua",
    tanggalUpload: "2026-07-11"
  },
  {
    id: "DOC002",
    judul: "Surat Keputusan (SK) Kelayakan Tenda & Kegiatan Penggalang SD",
    linkDrive: "https://drive.google.com/file/d/1example_sk_sd/view",
    tingkatan: "Penggalang SD (SD/MI)",
    tanggalUpload: "2026-07-12"
  },
  {
    id: "DOC003",
    judul: "Panduan Lomba Penjelajahan Wide Game Penegak SMA",
    linkDrive: "https://drive.google.com/file/d/1example_panduan_penegak/view",
    tingkatan: "Penegak (SMA/MA/SMK)",
    tanggalUpload: "2026-07-13"
  }
];


