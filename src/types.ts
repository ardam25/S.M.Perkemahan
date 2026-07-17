/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Peserta {
  idPeserta: string;
  namaPangkalan: string;
  jenisKelamin: 'Putra' | 'Putri';
  kodeQr: string;
  tanggalDaftar: string;
  statusAktif: boolean;
  tingkatan?: 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)';
}

export interface Kegiatan {
  idKegiatan: string;
  namaKegiatan: string;
  hari: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  status: 'Aktif' | 'Selesai';
  urutan: number;
  tingkatan?: ('Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)')[];
}

export interface Kehadiran {
  id: string; // Internal identifier for state tracking
  tanggal: string;
  jam: string;
  idPeserta: string;
  namaPangkalan: string;
  jenisKelamin: 'Putra' | 'Putri';
  idKegiatan: string;
  namaKegiatan: string;
  statusHadir: 'Hadir' | 'Tidak Hadir';
  petugas: string;
}

export interface AnggotaPramuka {
  id: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
}

export interface PangkalanDetail {
  idPeserta: string;
  namaPembina: string;
  hpPembina: string;
  anggota: AnggotaPramuka[];
}

export interface Admin {
  username: string;
  password?: string; // Kept secure, omitted in some listings
  nama: string;
  level: 'Super Admin' | 'Panitia';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  pengguna: string;
  aktivitas: string;
  detail: string;
}

export interface AppSettings {
  namaEvent: string;
  kwartir: string;
  darkTheme: boolean;
  autoRefreshInterval: number; // in seconds
  soundEnabled: boolean;
  speechEnabled: boolean;
  batchScanDelay: number; // in milliseconds
  lokasiEvent?: string;
  pelaksanaEvent?: string;
  gasUrl?: string;
  logoUrl?: string;
}

export interface Pengumuman {
  id: string;
  judul: string;
  konten: string;
  tanggal: string; // "YYYY-MM-DD"
  jam: string;     // "HH:MM"
  tingkatanTarget: 'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)';
  statusAktif: boolean;
  dibuatOleh: string; // Admin's nama or username
}

export interface DokumenKegiatan {
  id: string;
  judul: string;
  linkDrive: string;
  tingkatan: 'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)';
  tanggalUpload: string;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // If it's already in Indonesian format or contains alphabet, return as is
  if (/[a-zA-Z]/.test(dateStr) && !dateStr.includes('T') && !dateStr.includes('Z')) {
    return dateStr;
  }

  try {
    let d: Date;
    // Check if format is YYYY-MM-DD without time info
    const simpleYMD = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (simpleYMD) {
      const year = parseInt(simpleYMD[1], 10);
      const month = parseInt(simpleYMD[2], 10) - 1;
      const day = parseInt(simpleYMD[3], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) {
      return dateStr;
    }

    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return `${day} ${months[month]} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatIndonesianTime(timeStr: string): string {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  
  // 1. Simple HH:MM or HH.MM format
  const simpleMatch = str.match(/^(\d{1,2})[:.](\d{2})$/);
  if (simpleMatch) {
    return `${simpleMatch[1].padStart(2, '0')}:${simpleMatch[2]}`;
  }

  // 2. HH:MM:SS or HH.MM.SS format
  const withSecsMatch = str.match(/^(\d{1,2})[:.](\d{2})[:.](\d{2})$/);
  if (withSecsMatch) {
    return `${withSecsMatch[1].padStart(2, '0')}:${withSecsMatch[2]}`;
  }

  // 3. ISO/ISO-like containing "T"
  if (str.includes('T')) {
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        if (date.getFullYear() === 1899) {
          const corrected = new Date(date.getTime() + 343000);
          hours = corrected.getHours();
          minutes = corrected.getMinutes();
        }
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    } catch (e) {
      // Fallback
    }
  }

  // 4. Fallback search for any HH:MM in the string
  const regexMatch = str.match(/(\d{1,2})[:.](\d{2})/);
  if (regexMatch) {
    return `${regexMatch[1].padStart(2, '0')}:${regexMatch[2]}`;
  }

  return str;
}

export function formatIndonesianPhoneNumber(phone: any): string {
  if (phone === undefined || phone === null) return '';
  let str = String(phone).trim();
  if (!str) return '';
  
  // Clean all non-digits
  let digits = str.replace(/\D/g, '');
  if (!digits) return str;
  
  // If starts with 62, replace with 0
  if (digits.startsWith('62')) {
    digits = '0' + digits.substring(2);
  }
  // If it doesn't start with 0, add 0
  else if (!digits.startsWith('0')) {
    digits = '0' + digits;
  }
  
  return digits;
}



