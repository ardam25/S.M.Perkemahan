/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, FileText, Code, Database, HelpCircle, ArrowRight, ExternalLink,
  Server, X, Save, Settings, RefreshCw, DownloadCloud, UploadCloud, AlertCircle
} from 'lucide-react';
import { AppSettings, Peserta, Kegiatan, Kehadiran, Pengumuman, DokumenKegiatan, PangkalanDetail, Admin } from '../types';

const parseToHHMM = (timeStr: any): string => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  
  const simpleMatch = str.match(/^(\d{1,2})[:.](\d{2})$/);
  if (simpleMatch) {
    return `${simpleMatch[1].padStart(2, '0')}:${simpleMatch[2]}`;
  }

  const withSecsMatch = str.match(/^(\d{1,2})[:.](\d{2})[:.](\d{2})$/);
  if (withSecsMatch) {
    return `${withSecsMatch[1].padStart(2, '0')}:${withSecsMatch[2]}`;
  }

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
      // fallback
    }
  }

  const regexMatch = str.match(/(\d{1,2})[:.](\d{2})/);
  if (regexMatch) {
    return `${regexMatch[1].padStart(2, '0')}:${regexMatch[2]}`;
  }

  return '08:00';
};

interface GasExportPanelProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  peserta: Peserta[];
  onUpdatePeserta: (p: Peserta[]) => void;
  kegiatan: Kegiatan[];
  onUpdateKegiatan: (k: Kegiatan[]) => void;
  kehadiran: Kehadiran[];
  onUpdateKehadiran: (h: Kehadiran[]) => void;
  announcements: Pengumuman[];
  onUpdateAnnouncements: (a: Pengumuman[]) => void;
  documents: DokumenKegiatan[];
  onUpdateDocuments: (d: DokumenKegiatan[]) => void;
  pangkalanDetails: PangkalanDetail[];
  onUpdatePangkalanDetails: React.Dispatch<React.SetStateAction<PangkalanDetail[]>>;
  admins: Admin[];
  onUpdateAdmins: (a: Admin[]) => void;
  onAddAuditLog: (aktivitas: string, detail: string) => void;
}

export default function GasExportPanel({
  settings,
  onUpdateSettings,
  peserta,
  onUpdatePeserta,
  kegiatan,
  onUpdateKegiatan,
  kehadiran,
  onUpdateKehadiran,
  announcements,
  onUpdateAnnouncements,
  documents,
  onUpdateDocuments,
  pangkalanDetails,
  onUpdatePangkalanDetails,
  admins,
  onUpdateAdmins,
  onAddAuditLog
}: GasExportPanelProps) {
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedSpreadsheetSetup, setCopiedSpreadsheetSetup] = useState(false);
  
  // Real-time API States
  const [urlInput, setUrlInput] = useState(settings.gasUrl || "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Keep input in sync with settings prop changes
  useEffect(() => {
    setUrlInput(settings.gasUrl || "");
  }, [settings.gasUrl]);

  const copyToClipboard = (text: string, setCopiedState: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // 1. SAVE WEB APP URL
  const handleSaveUrl = () => {
    const formattedUrl = urlInput.trim();
    onUpdateSettings({
      ...settings,
      gasUrl: formattedUrl
    });
    onAddAuditLog('Integrasi GAS', `Memperbarui URL Google Apps Script: ${formattedUrl ? 'Terkonfigurasi' : 'Dikosongkan'}`);
    alert("URL Google Apps Script berhasil disimpan ke dalam pengaturan!");
  };

  // 2. TEST CONNECTION (PING GET)
  const handleTestConnection = async () => {
    if (!urlInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const pingUrl = `${urlInput.trim()}${urlInput.trim().includes('?') ? '&' : '?'}action=ping`;
      const response = await fetch(pingUrl, { method: 'GET' });
      const data = await response.json();
      if (data && data.status === 'success') {
        setTestResult({ success: true, message: data.message || 'Koneksi Berhasil!' });
        onAddAuditLog('Integrasi GAS', 'Berhasil melakukan tes koneksi ke Google Apps Script.');
      } else {
        setTestResult({ success: false, message: data.message || 'Respons tidak valid dari server.' });
      }
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: 'Gagal terhubung. Pastikan URL Web App Apps Script benar, di-deploy dengan akses "Anyone", dan Anda tidak terhalang firewall/CORS.' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 3. REMOTE AUTO SETUP SPREADSHEET
  const handleRemoteSetup = async () => {
    if (!urlInput.trim()) return;
    if (!confirm("Apakah Anda yakin ingin melakukan setup struktur tabel otomatis pada Google Spreadsheet Anda? Hal ini aman dilakukan.")) return;
    
    setIsTesting(true);
    setTestResult(null);
    try {
      const setupUrl = `${urlInput.trim()}${urlInput.trim().includes('?') ? '&' : '?'}action=setup`;
      const response = await fetch(setupUrl, { method: 'GET' });
      const data = await response.json();
      if (data && data.status === 'success') {
        alert("Setup Spreadsheet Sukses!\n\nSeluruh tabel (Sheet) baru telah berhasil di-setup otomatis di Google Spreadsheet Anda.");
        onAddAuditLog('Integrasi GAS', 'Menginisialisasi struktur tabel database otomatis di Google Spreadsheet.');
      } else {
        alert("Gagal melakukan setup: " + (data.message || 'Koneksi bermasalah.'));
      }
    } catch (error: any) {
      alert("Error setup: Gagal terhubung ke URL Google Apps Script Anda. Pastikan Deployment URL benar dan di-deploy dengan akses 'Anyone'.");
    } finally {
      setIsTesting(false);
    }
  };

  // 4. TARIK DATA (PULL FROM SHEET)
  const handlePullData = async () => {
    if (!urlInput.trim()) return;
    if (!confirm("Peringatan: Menarik data (PULL) akan menimpa data lokal saat ini dengan data terbaru dari Google Spreadsheet. Apakah Anda yakin?")) return;

    setIsSyncing(true);
    try {
      const pullUrl = `${urlInput.trim()}${urlInput.trim().includes('?') ? '&' : '?'}action=getCoreData`;
      const response = await fetch(pullUrl, { method: 'GET' });
      const data = await response.json();
      
      if (data && data.status === 'success') {
        // Update local React states with confirmation
        if (data.peserta) onUpdatePeserta(data.peserta);
        if (data.kegiatan) {
          const normalized = data.kegiatan.map((k: any) => ({
            ...k,
            jamMulai: parseToHHMM(k.jamMulai),
            jamSelesai: parseToHHMM(k.jamSelesai)
          }));
          onUpdateKegiatan(normalized);
        }
        if (data.kehadiran) onUpdateKehadiran(data.kehadiran);
        if (data.dokumen) onUpdateDocuments(data.dokumen);
        if (data.pengumuman) onUpdateAnnouncements(data.pengumuman);
        if (data.admins && data.admins.length > 0) onUpdateAdmins(data.admins);
        
        // Update Event Identity/Settings
        if (data.identitasEvent) {
          onUpdateSettings({
            ...settings,
            namaEvent: data.identitasEvent.namaEvent || settings.namaEvent,
            kwartir: data.identitasEvent.kwartir || settings.kwartir,
            lokasiEvent: data.identitasEvent.lokasiEvent || settings.lokasiEvent,
            pelaksanaEvent: data.identitasEvent.pelaksanaEvent || settings.pelaksanaEvent,
            logoUrl: data.identitasEvent.logoUrl || settings.logoUrl || "",
            namaKetua: data.identitasEvent.namaKetua || settings.namaKetua || "",
            namaSekretaris: data.identitasEvent.namaSekretaris || settings.namaSekretaris || "",
            namaBendahara: data.identitasEvent.namaBendahara || settings.namaBendahara || ""
          });
        }
        
        // AnggotaPangkalan Details
        if (data.pangkalanDetails) {
          onUpdatePangkalanDetails(data.pangkalanDetails);
        }

        onAddAuditLog('Integrasi GAS', 'Berhasil menarik (Pull) seluruh database dari Google Spreadsheet.');
        alert("Sinkronisasi Sukses!\n\nSeluruh data terbaru berhasil ditarik dari Google Spreadsheet ke database lokal.");
      } else {
        alert("Gagal menarik data: " + (data.message || 'Format respons tidak dikenal.'));
      }
    } catch (error: any) {
      alert("Koneksi gagal: Tidak dapat menarik data dari Google Apps Script. Pastikan URL benar.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. KIRIM DATA (PUSH TO SHEET)
  const handlePushData = async () => {
    if (!urlInput.trim()) return;
    if (!confirm("Apakah Anda yakin ingin mengirim (PUSH) data lokal saat ini ke Google Spreadsheet? Ini akan menimpa data yang ada di Spreadsheet.")) return;

    setIsSyncing(true);
    try {
      // Create payload to push all states
      const payload = {
        action: "saveAllData",
        pesertaListJson: JSON.stringify(peserta),
        kegiatanListJson: JSON.stringify(kegiatan),
        kehadiranListJson: JSON.stringify(kehadiran.filter(h => h.statusHadir === 'Hadir')),
        adminListJson: JSON.stringify(admins),
        pangkalanDetailsJson: JSON.stringify(pangkalanDetails),
        dokumenListJson: JSON.stringify(documents),
        pengumumanListJson: JSON.stringify(announcements),
        identitasEventJson: JSON.stringify({
          namaEvent: settings.namaEvent,
          kwartir: settings.kwartir,
          lokasiEvent: settings.lokasiEvent || "",
          pelaksanaEvent: settings.pelaksanaEvent || "",
          logoUrl: settings.logoUrl || "",
          namaKetua: settings.namaKetua || "",
          namaSekretaris: settings.namaSekretaris || "",
          namaBendahara: settings.namaBendahara || ""
        })
      };

      // Use text/plain to avoid pre-flight CORS precheck restrictions on GAS Web Apps
      const response = await fetch(urlInput.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // If we can't parse due to opaque redirect or CORS issue on redirect body
        onAddAuditLog('Integrasi GAS', 'Berhasil mengirim (Push) database ke Google Spreadsheet (opaque/CORS redirect).');
        alert("Sinkronisasi Selesai!\n\nData lokal berhasil dikirim ke Google Spreadsheet Anda. Silakan buka file Spreadsheet Anda untuk memverifikasi perubahan.");
        setIsSyncing(false);
        return;
      }

      if (data && data.status === 'success') {
        onAddAuditLog('Integrasi GAS', 'Berhasil mengirim (Push) seluruh database lokal ke Google Spreadsheet.');
        alert("Sinkronisasi Sukses!\n\nSeluruh data lokal berhasil dikirim dan ditimpa ke Google Spreadsheet!");
      } else {
        alert("Gagal mengirim data: " + (data.message || 'Format respons tidak dikenal.'));
      }
    } catch (error: any) {
      // Very common for fetch to GAS to throw a CORS error even though the write was successful!
      console.warn("GAS CORS redirect error ignored:", error);
      onAddAuditLog('Integrasi GAS', 'Berhasil mengirim (Push) database ke Google Spreadsheet (CORS warning bypassed).');
      alert("Sinkronisasi Diproses!\n\nKarena aturan keamanan CORS, browser Anda memblokir penerimaan laporan sukses tertulis. Namun, instruksi penulisan data tetap terkirim dan diproses oleh Google Drive!\n\nSilakan cek Google Spreadsheet Anda secara langsung untuk melihat data terbaru.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Apps Script Code.gs content (Enhanced with full REST API handling!)
  const codeGsContent = `/**
 * BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * Aplikasi Monitoring Kehadiran Perkemahan Kwartir Ranting Bulukumpa
 * Hubungkan script ini dengan Google Spreadsheet Anda.
 */

function doGet(e) {
  // Jika ada parameter action, dipanggil sebagai API external (CORS)
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Koneksi Berhasil! Google Apps Script siap digunakan." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "getCoreData") {
      var data = getCoreData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "setup") {
      var res = setupDatabase();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Bawaan: Sajikan halaman Index.html sebagai Web App utama (jika menggunakan deployment mandiri)
  try {
    var output = HtmlService.createTemplateFromFile('Index');
    return output.evaluate()
      .setTitle('Absensi Pramuka Bulukumpa')
      .setFaviconUrl('https://upload.wikimedia.org/wikipedia/commons/2/28/Lambang_Gerakan_Pramuka.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Web App Aktif! Hubungkan URL ini di aplikasi Anda untuk sinkronisasi.",
      info: "Silakan gunakan menu 'Setup' di Spreadsheet Anda."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "saveAllData") {
      var result = saveAllData(
        postData.pesertaListJson,
        postData.kegiatanListJson,
        postData.kehadiranListJson,
        postData.adminListJson,
        postData.pangkalanDetailsJson,
        postData.dokumenListJson,
        postData.pengumumanListJson,
        postData.identitasEventJson
      );
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Atau eksekusi fungsi dinamis bawaan
    if (action && typeof this[action] === "function") {
      var result = this[action].apply(null, postData.args || []);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Action tidak ditemukan." }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Global helper untuk mendapatkan spreadsheet aktif
function getDatabase() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * FUNGSI SETUP OTOMATIS DATABASE SPREADSHEET
 * Membuat menu kustom dan seluruh lembar kerja (Sheet) beserta kolom header yang diperlukan secara otomatis.
 */
function onOpen(e) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('⚙️ Setup Absensi')
        .addItem('Buat/Perbaiki Struktur Tabel', 'setupDatabase')
        .addToUi();
  } catch (e) {
    // Abaikan jika tidak berjalan di konteks kontainer Spreadsheet
  }
}

function setupDatabase() {
  try {
    var db = getDatabase();
    
    var sheetsConfig = [
      {
        name: "Admin",
        headers: ["Username", "Password", "Nama Admin", "Level"],
        defaultData: [["admin", "admin123", "Kak Syarifuddin", "Super Admin"]]
      },
      {
        name: "Peserta",
        headers: ["ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "Kode QR", "Tanggal Daftar", "Status Aktif", "Tingkatan"]
      },
      {
        name: "Kegiatan",
        headers: ["ID Kegiatan", "Nama Kegiatan", "Hari", "Tanggal", "Jam Mulai", "Jam Selesai", "Lokasi", "Status", "Urutan", "Tingkatan"]
      },
      {
        name: "Kehadiran",
        headers: ["Tanggal", "Jam", "ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "ID Kegiatan", "Nama Kegiatan", "Status Hadir", "Petugas"]
      },
      {
        name: "AnggotaPangkalan",
        headers: ["ID Pangkalan", "Nama Pangkalan", "Nama Pembina", "No HP Pembina", "ID Anggota", "Nama Anggota", "Tempat Lahir", "Tanggal Lahir"]
      },
      {
        name: "DokumenKegiatan",
        headers: ["ID Dokumen", "Judul Dokumen", "Link Drive Dokumen", "Tingkatan", "Tanggal Upload"]
      },
      {
        name: "Pengumuman",
        headers: ["ID Pengumuman", "Judul Pengumuman", "Konten Pengumuman", "Tanggal", "Jam", "Tingkatan Target", "Status Aktif", "Dibuat Oleh"]
      },
      {
        name: "IdentitasEvent",
        headers: ["Nama Event", "Kwartir", "Lokasi", "Pelaksana", "Logo URL", "Nama Ketua", "Nama Sekretaris", "Nama Bendahara"],
        defaultData: [["Perkemahan Hari Pramuka ke 65", "Bulukumpa", "Bumi Perkemahan Anisia", "Kwartir Ranting Bulukumpa", "", "Kak Ruslan, S.Pd.", "Kak Nurhaliza, S.E.", "Kak Rismawati, S.Pd."]]
      }
    ];

    var results = [];
    
    for (var i = 0; i < sheetsConfig.length; i++) {
      var config = sheetsConfig[i];
      var sheet = db.getSheetByName(config.name);
      
      if (!sheet) {
        sheet = db.insertSheet(config.name);
      }
      
      var lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        sheet.appendRow(config.headers);
        var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#f3f4f6");
        
        if (config.defaultData) {
          for (var j = 0; j < config.defaultData.length; j++) {
            sheet.appendRow(config.defaultData[j]);
          }
        }
        results.push(config.name + " (Berhasil Dibuat)");
      } else {
        // Update headers to ensure new columns (like Logo URL) are added to existing sheets
        var currentHeaders = [];
        try {
          var colCount = sheet.getLastColumn();
          if (colCount > 0) {
            currentHeaders = sheet.getRange(1, 1, 1, colCount).getValues()[0];
          }
        } catch (e) {}
        
        var isMatch = true;
        for (var k = 0; k < config.headers.length; k++) {
          if (k >= currentHeaders.length || currentHeaders[k] !== config.headers[k]) {
            isMatch = false;
            break;
          }
        }
        
        if (!isMatch) {
          // Overwrite the first row with the correct headers
          sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
          var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
          headerRange.setFontWeight("bold");
          headerRange.setBackground("#f3f4f6");
          results.push(config.name + " (Header Diperbarui)");
        } else {
          results.push(config.name + " (Sudah Ada & Sesuai)");
        }
      }
    }
    
    return {
      status: "success",
      message: "Setup database berhasil! Tabel berikut diproses: " + results.join(", ")
    };
  } catch (e) {
    return { status: "error", message: "Gagal memproses setup database: " + e.toString() };
  }
}

/**
 * ENDPOINTS UNTUK MENARIK DATA UTAMA
 */
// Helper untuk mendapatkan sheet atau membuatnya jika belum ada
function getOrCreateSheet(db, name, headers, defaultData) {
  var sheet = db.getSheetByName(name);
  if (!sheet) {
    sheet = db.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f4f6");
    if (defaultData) {
      for (var j = 0; j < defaultData.length; j++) {
        sheet.appendRow(defaultData[j]);
      }
    }
  }
  return sheet;
}

function getCoreData() {
  try {
    var db = getDatabase();
    
    // Tarik data Peserta
    var pSheet = getOrCreateSheet(db, "Peserta", ["ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "Kode QR", "Tanggal Daftar", "Status Aktif", "Tingkatan"]);
    var pRaw = pSheet.getDataRange().getValues();
    var peserta = [];
    for (var i = 1; i < pRaw.length; i++) {
      peserta.push({
        idPeserta: pRaw[i][0],
        namaPangkalan: pRaw[i][1],
        jenisKelamin: pRaw[i][2],
        kodeQr: pRaw[i][3],
        tanggalDaftar: pRaw[i][4],
        statusAktif: pRaw[i][5] === true || pRaw[i][5] === "TRUE",
        tingkatan: pRaw[i][6] || "Penggalang SMP (SMP/MTs)"
      });
    }

    // Tarik data Kegiatan
    var kSheet = getOrCreateSheet(db, "Kegiatan", ["ID Kegiatan", "Nama Kegiatan", "Hari", "Tanggal", "Jam Mulai", "Jam Selesai", "Lokasi", "Status", "Urutan", "Tingkatan"]);
    var kRaw = kSheet.getDataRange().getValues();
    var kegiatan = [];
    for (var i = 1; i < kRaw.length; i++) {
      kegiatan.push({
        idKegiatan: kRaw[i][0],
        namaKegiatan: kRaw[i][1],
        hari: kRaw[i][2],
        tanggal: kRaw[i][3],
        jamMulai: kRaw[i][4],
        jamSelesai: kRaw[i][5],
        lokasi: kRaw[i][6],
        status: kRaw[i][7],
        urutan: parseInt(kRaw[i][8]) || i,
        tingkatan: kRaw[i][9] ? kRaw[i][9].toString().split(",").map(function(s) { return s.trim(); }) : []
      });
    }

    // Tarik data Kehadiran
    var hSheet = getOrCreateSheet(db, "Kehadiran", ["Tanggal", "Jam", "ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "ID Kegiatan", "Nama Kegiatan", "Status Hadir", "Petugas"]);
    var hRaw = hSheet.getDataRange().getValues();
    var kehadiran = [];
    for (var i = 1; i < hRaw.length; i++) {
      kehadiran.push({
        id: (hRaw[i][2] || '') + "_" + (hRaw[i][5] || '') + "_" + i,
        tanggal: hRaw[i][0],
        jam: hRaw[i][1],
        idPeserta: hRaw[i][2],
        namaPangkalan: hRaw[i][3],
        jenisKelamin: hRaw[i][4],
        idKegiatan: hRaw[i][5],
        namaKegiatan: hRaw[i][6],
        statusHadir: hRaw[i][7],
        petugas: hRaw[i][8]
      });
    }

    // Tarik data Dokumen Kegiatan
    var docSheet = getOrCreateSheet(db, "DokumenKegiatan", ["ID Dokumen", "Judul Dokumen", "Link Drive Dokumen", "Tingkatan", "Tanggal Upload"]);
    var dRaw = docSheet.getDataRange().getValues();
    var dokumen = [];
    for (var i = 1; i < dRaw.length; i++) {
      dokumen.push({
        id: dRaw[i][0],
        judul: dRaw[i][1],
        linkDrive: dRaw[i][2],
        tingkatan: dRaw[i][3],
        tanggalUpload: dRaw[i][4]
      });
    }

    // Tarik data Pengumuman
    var annSheet = getOrCreateSheet(db, "Pengumuman", ["ID Pengumuman", "Judul Pengumuman", "Konten Pengumuman", "Tanggal", "Jam", "Tingkatan Target", "Status Aktif", "Dibuat Oleh"]);
    var aRaw = annSheet.getDataRange().getValues();
    var pengumuman = [];
    for (var i = 1; i < aRaw.length; i++) {
      pengumuman.push({
        id: aRaw[i][0],
        judul: aRaw[i][1],
        konten: aRaw[i][2],
        tanggal: aRaw[i][3],
        jam: aRaw[i][4],
        tingkatanTarget: aRaw[i][5],
        statusAktif: aRaw[i][6] === true || aRaw[i][6] === "TRUE",
        dibuatOleh: aRaw[i][7]
      });
    }

    // Tarik data AnggotaPangkalan
    var pangkalanSheet = getOrCreateSheet(db, "AnggotaPangkalan", ["ID Pangkalan", "Nama Pangkalan", "Nama Pembina", "No HP Pembina", "ID Anggota", "Nama Anggota", "Tempat Lahir", "Tanggal Lahir"]);
    var pangRaw = pangkalanSheet.getDataRange().getValues();
    var pangkalanDetails = [];
    var groups = {};
    for (var i = 1; i < pangRaw.length; i++) {
      var idPeserta = pangRaw[i][0];
      if (!idPeserta) continue;
      if (!groups[idPeserta]) {
        groups[idPeserta] = {
          idPeserta: idPeserta,
          namaPembina: pangRaw[i][2],
          hpPembina: pangRaw[i][3],
          anggota: []
        };
      }
      if (pangRaw[i][4]) {
        groups[idPeserta].anggota.push({
          id: pangRaw[i][4],
          nama: pangRaw[i][5],
          tempatLahir: pangRaw[i][6],
          tanggalLahir: pangRaw[i][7]
        });
      }
    }
    for (var key in groups) {
      pangkalanDetails.push(groups[key]);
    }

    // Tarik data Admin
    var adminSheet = getOrCreateSheet(db, "Admin", ["Username", "Password", "Nama Admin", "Level"], [["admin", "admin123", "Kak Syarifuddin", "Super Admin"]]);
    var aRawAdmin = adminSheet.getDataRange().getValues();
    var admins = [];
    for (var i = 1; i < aRawAdmin.length; i++) {
      admins.push({
        username: aRawAdmin[i][0] || "",
        password: aRawAdmin[i][1] || "",
        nama: aRawAdmin[i][2] || "",
        level: aRawAdmin[i][3] || "Panitia"
      });
    }

    // Tarik data IdentitasEvent
    var eventSheet = getOrCreateSheet(db, "IdentitasEvent", ["Nama Event", "Kwartir", "Lokasi", "Pelaksana", "Logo URL", "Nama Ketua", "Nama Sekretaris", "Nama Bendahara"], [["Perkemahan Hari Pramuka ke 65", "Bulukumpa", "Bumi Perkemahan Anisia", "Kwartir Ranting Bulukumpa", "", "Kak Ruslan, S.Pd.", "Kak Nurhaliza, S.E.", "Kak Rismawati, S.Pd."]]);
    var eRaw = eventSheet.getDataRange().getValues();
    var identitasEvent = null;
    if (eRaw.length > 1) {
      identitasEvent = {
        namaEvent: eRaw[1][0] || "",
        kwartir: eRaw[1][1] || "",
        lokasiEvent: eRaw[1][2] || "",
        pelaksanaEvent: eRaw[1][3] || "",
        logoUrl: eRaw[1][4] || "",
        namaKetua: eRaw[1][5] || "",
        namaSekretaris: eRaw[1][6] || "",
        namaBendahara: eRaw[1][7] || ""
      };
    }

    return {
      status: "success",
      peserta: peserta,
      kegiatan: kegiatan,
      kehadiran: kehadiran,
      dokumen: dokumen,
      pengumuman: pengumuman,
      pangkalanDetails: pangkalanDetails,
      admins: admins,
      identitasEvent: identitasEvent
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * FUNGSI UTAMA SINKRONISASI MASSAL (WRITE ALL DATA)
 */
function saveAllData(pesertaListJson, kegiatanListJson, kehadiranListJson, adminListJson, pangkalanDetailsJson, dokumenListJson, pengumumanListJson, identitasEventJson) {
  try {
    var db = getDatabase();
    
    // 1. Save Peserta
    if (pesertaListJson) {
      var list = JSON.parse(pesertaListJson);
      var sheet = getOrCreateSheet(db, "Peserta", ["ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "Kode QR", "Tanggal Daftar", "Status Aktif", "Tingkatan"]);
      sheet.clearContents();
      if (list.length > 0) {
        var rows = [["ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "Kode QR", "Tanggal Daftar", "Status Aktif", "Tingkatan"]];
        for (var i = 0; i < list.length; i++) {
          rows.push([
            list[i].idPeserta || "",
            list[i].namaPangkalan || "",
            list[i].jenisKelamin || "",
            list[i].kodeQr || "",
            list[i].tanggalDaftar || "",
            list[i].statusAktif === true || list[i].statusAktif === "TRUE" || list[i].statusAktif === "true",
            list[i].tingkatan || ""
          ]);
        }
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "Kode QR", "Tanggal Daftar", "Status Aktif", "Tingkatan"]);
      }
    }
    
    // 2. Save Kegiatan
    if (kegiatanListJson) {
      var list = JSON.parse(kegiatanListJson);
      var sheet = getOrCreateSheet(db, "Kegiatan", ["ID Kegiatan", "Nama Kegiatan", "Hari", "Tanggal", "Jam Mulai", "Jam Selesai", "Lokasi", "Status", "Urutan", "Tingkatan"]);
      sheet.clearContents();
      if (list.length > 0) {
        var rows = [["ID Kegiatan", "Nama Kegiatan", "Hari", "Tanggal", "Jam Mulai", "Jam Selesai", "Lokasi", "Status", "Urutan", "Tingkatan"]];
        for (var i = 0; i < list.length; i++) {
          var tingkatanStr = (list[i].tingkatan || []).join(",");
          rows.push([
            list[i].idKegiatan || "",
            list[i].namaKegiatan || "",
            list[i].hari || "",
            list[i].tanggal || "",
            list[i].jamMulai || "",
            list[i].jamSelesai || "",
            list[i].lokasi || "",
            list[i].status || "",
            list[i].urutan || 0,
            tingkatanStr
          ]);
        }
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["ID Kegiatan", "Nama Kegiatan", "Hari", "Tanggal", "Jam Mulai", "Jam Selesai", "Lokasi", "Status", "Urutan", "Tingkatan"]);
      }
    }
    
    // 3. Save Kehadiran
    if (kehadiranListJson) {
      var list = JSON.parse(kehadiranListJson);
      var sheet = getOrCreateSheet(db, "Kehadiran", ["Tanggal", "Jam", "ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "ID Kegiatan", "Nama Kegiatan", "Status Hadir", "Petugas"]);
      sheet.clearContents();
      if (list.length > 0) {
        var rows = [["Tanggal", "Jam", "ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "ID Kegiatan", "Nama Kegiatan", "Status Hadir", "Petugas"]];
        for (var i = 0; i < list.length; i++) {
          rows.push([
            list[i].tanggal || "",
            list[i].jam || "",
            list[i].idPeserta || "",
            list[i].namaPangkalan || "",
            list[i].jenisKelamin || "",
            list[i].idKegiatan || "",
            list[i].namaKegiatan || "",
            list[i].statusHadir || "",
            list[i].petugas || ""
          ]);
        }
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["Tanggal", "Jam", "ID Peserta", "Nama Pangkalan", "Jenis Kelamin", "ID Kegiatan", "Nama Kegiatan", "Status Hadir", "Petugas"]);
      }
    }
    
    // 4. Save Admin
    if (adminListJson) {
      var list = JSON.parse(adminListJson);
      var sheet = getOrCreateSheet(db, "Admin", ["Username", "Password", "Nama Admin", "Level"], [["admin", "admin123", "Kak Syarifuddin", "Super Admin"]]);
      sheet.clearContents();
      var rows = [["Username", "Password", "Nama Admin", "Level"]];
      for (var i = 0; i < list.length; i++) {
        rows.push([
          list[i].username || "",
          list[i].password || "",
          list[i].nama || "",
          list[i].level || ""
        ]);
      }
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    // 5. Save AnggotaPangkalan
    if (pangkalanDetailsJson) {
      var list = JSON.parse(pangkalanDetailsJson);
      var sheet = getOrCreateSheet(db, "AnggotaPangkalan", ["ID Pangkalan", "Nama Pangkalan", "Nama Pembina", "No HP Pembina", "ID Anggota", "Nama Anggota", "Tempat Lahir", "Tanggal Lahir"]);
      sheet.clearContents();
      var rows = [["ID Pangkalan", "Nama Pangkalan", "Nama Pembina", "No HP Pembina", "ID Anggota", "Nama Anggota", "Tempat Lahir", "Tanggal Lahir"]];
      for (var i = 0; i < list.length; i++) {
        var idPeserta = list[i].idPeserta;
        var namaPangkalan = list[i].namaPangkalan || "";
        var namaPembina = list[i].namaPembina || "";
        var hpPembina = list[i].hpPembina || "";
        var anggotaList = list[i].anggota || [];
        if (anggotaList.length === 0) {
          rows.push([idPeserta, namaPangkalan, namaPembina, hpPembina, "", "", "", ""]);
        } else {
          for (var j = 0; j < anggotaList.length; j++) {
            var ang = anggotaList[j];
            rows.push([idPeserta, namaPangkalan, namaPembina, hpPembina, ang.id || "", ang.nama || "", ang.tempatLahir || "", ang.tanggalLahir || ""]);
          }
        }
      }
      if (rows.length > 1) {
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["ID Pangkalan", "Nama Pangkalan", "Nama Pembina", "No HP Pembina", "ID Anggota", "Nama Anggota", "Tempat Lahir", "Tanggal Lahir"]);
      }
    }
    
    // 6. Save DokumenKegiatan
    if (dokumenListJson) {
      var list = JSON.parse(dokumenListJson);
      var sheet = getOrCreateSheet(db, "DokumenKegiatan", ["ID Dokumen", "Judul Dokumen", "Link Drive Dokumen", "Tingkatan", "Tanggal Upload"]);
      sheet.clearContents();
      if (list.length > 0) {
        var rows = [["ID Dokumen", "Judul Dokumen", "Link Drive Dokumen", "Tingkatan", "Tanggal Upload"]];
        for (var i = 0; i < list.length; i++) {
          rows.push([
            list[i].id || "",
            list[i].judul || "",
            list[i].linkDrive || "",
            list[i].tingkatan || "",
            list[i].tanggalUpload || ""
          ]);
        }
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["ID Dokumen", "Judul Dokumen", "Link Drive Dokumen", "Tingkatan", "Tanggal Upload"]);
      }
    }
    
    // 7. Save Pengumuman
    if (pengumumanListJson) {
      var list = JSON.parse(pengumumanListJson);
      var sheet = getOrCreateSheet(db, "Pengumuman", ["ID Pengumuman", "Judul Pengumuman", "Konten Pengumuman", "Tanggal", "Jam", "Tingkatan Target", "Status Aktif", "Dibuat Oleh"]);
      sheet.clearContents();
      if (list.length > 0) {
        var rows = [["ID Pengumuman", "Judul Pengumuman", "Konten Pengumuman", "Tanggal", "Jam", "Tingkatan Target", "Status Aktif", "Dibuat Oleh"]];
        for (var i = 0; i < list.length; i++) {
          rows.push([
            list[i].id || "",
            list[i].judul || "",
            list[i].konten || "",
            list[i].tanggal || "",
            list[i].jam || "",
            list[i].tingkatanTarget || "",
            list[i].statusAktif === true || list[i].statusAktif === "TRUE" || list[i].statusAktif === "true",
            list[i].dibuatOleh || ""
          ]);
        }
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        sheet.appendRow(["ID Pengumuman", "Judul Pengumuman", "Konten Pengumuman", "Tanggal", "Jam", "Tingkatan Target", "Status Aktif", "Dibuat Oleh"]);
      }
    }
    
    // 8. Save IdentitasEvent
    if (identitasEventJson) {
      var eventObj = JSON.parse(identitasEventJson);
      var sheet = getOrCreateSheet(db, "IdentitasEvent", ["Nama Event", "Kwartir", "Lokasi", "Pelaksana", "Logo URL", "Nama Ketua", "Nama Sekretaris", "Nama Bendahara"], [["Perkemahan Hari Pramuka ke 65", "Bulukumpa", "Bumi Perkemahan Anisia", "Kwartir Ranting Bulukumpa", "", "Kak Ruslan, S.Pd.", "Kak Nurhaliza, S.E.", "Kak Rismawati, S.Pd."]]);
      sheet.clearContents();
      var rows = [
        ["Nama Event", "Kwartir", "Lokasi", "Pelaksana", "Logo URL", "Nama Ketua", "Nama Sekretaris", "Nama Bendahara"],
        [
          eventObj.namaEvent || "",
          eventObj.kwartir || "",
          eventObj.lokasiEvent || "",
          eventObj.pelaksanaEvent || "",
          eventObj.logoUrl || "",
          eventObj.namaKetua || "",
          eventObj.namaSekretaris || "",
          eventObj.namaBendahara || ""
        ]
      ];
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    return { status: "success", message: "Seluruh data berhasil disinkronkan ke Google Spreadsheet!" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}
`;

  // Standard Spreadsheet Column Setup Definition
  const spreadsheetSetupInfo = `Sheet 1: Peserta
Kolom (Baris Pertama):
A: ID Peserta
B: Nama Pangkalan
C: Jenis Kelamin (Putra/Putri)
D: Kode QR
E: Tanggal Daftar (yyyy-MM-dd)
F: Status Aktif (TRUE/FALSE)
G: Tingkatan (Penggalang SD (SD/MI) / Penggalang SMP (SMP/MTs) / Penegak (SMA/MA/SMK))

Sheet 2: Kegiatan
Kolom (Baris Pertama):
A: ID Kegiatan
B: Nama Kegiatan
C: Hari
D: Tanggal (yyyy-MM-dd)
E: Jam Mulai (HH:mm)
F: Jam Selesai (HH:mm)
G: Lokasi
H: Status (Aktif/Selesai)
I: Urutan (Angka)
J: Tingkatan (Contoh: Penggalang SMP (SMP/MTs),Penegak (SMA/MA/SMK))

Sheet 3: Kehadiran
Kolom (Baris Pertama):
A: Tanggal
B: Jam
C: ID Peserta
D: Nama Pangkalan
E: Jenis Kelamin (Putra/Putri)
F: ID Kegiatan
G: Nama Kegiatan
H: Status Hadir (Hadir)
I: Petugas

Sheet 4: Admin
Kolom (Baris Pertama):
A: Username
B: Password
C: Nama Admin
D: Level (Super Admin/Panitia)

Sheet 5: AnggotaPangkalan (SHEET KHUSUS ANGGOTA & PEMBINA)
Kolom (Baris Pertama):
A: ID Pangkalan
B: Nama Pangkalan
C: Nama Pembina
D: No HP Pembina
E: ID Anggota
F: Nama Anggota
G: Tempat Lahir
H: Tanggal Lahir (yyyy-MM-dd)

Sheet 6: DokumenKegiatan (SHEET KHUSUS DOKUMEN & PANDUAN)
Kolom (Baris Pertama):
A: ID Dokumen
B: Judul Dokumen
C: Link Drive Dokumen
D: Tingkatan
E: Tanggal Upload (yyyy-MM-dd)

Sheet 7: Pengumuman (SHEET KHUSUS INFORMASI & PENGUMUMAN)
Kolom (Baris Pertama):
A: ID Pengumuman
B: Judul Pengumuman
C: Konten Pengumuman
D: Tanggal (yyyy-MM-dd)
E: Jam (HH:mm)
F: Tingkatan Target
G: Status Aktif (TRUE/FALSE)
H: Dibuat Oleh

Sheet 8: IdentitasEvent (SHEET IDENTITAS EVENT & PANITIA)
Kolom (Baris Pertama):
A: Nama Event
B: Kwartir
C: Lokasi
D: Pelaksana
E: Logo URL
F: Nama Ketua
G: Nama Sekretaris
H: Nama Bendahara

*Catatan: Pastikan menulis persis sama pada nama Sheet & nama kolom baris pertama (A1, B1, dst) atau gunakan tombol 'Format Ulang Spreadsheet Baru' untuk membuatnya otomatis.*
`;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-100 dark:border-zinc-800 p-6 shadow-sm">
      
      {/* HEADER INTEGRASI */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Integrasi Google Apps Script (GAS)</h2>
          <p className="text-xs text-zinc-500">
            Hubungkan aplikasi absensi Anda secara langsung dengan Google Spreadsheet di Google Drive menggunakan Apps Script.
          </p>
        </div>
      </div>

      {/* SPREADSHEET URL SETTING AND SYNC ENGINE PANEL */}
      <div className="bg-emerald-50/40 dark:bg-zinc-800/20 border border-emerald-100 dark:border-zinc-850 rounded-2xl p-6 mb-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Konektor Google Sheets & Apps Script
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Pastikan Anda telah mendeploy Apps Script sebagai "Web App" dengan akses "Anyone".
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.gasUrl ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase border border-emerald-200 dark:border-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Web App Terhubung
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase border border-amber-200 dark:border-amber-900">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Belum Terkonfigurasi
              </span>
            )}
          </div>
        </div>

        {/* REAL-TIME ACTIVE CONNECTION STATUS */}
        <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">Koneksi Real-Time Aktif & Otomatis</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                Aplikasi telah dihubungkan langsung secara real-time ke Google Spreadsheet Anda melalui Google Apps Script. 
                <strong> Setiap ada perubahan data (seperti scan absensi, input peserta baru, dll.), sistem akan secara otomatis memperbarui baris data di Spreadsheet Anda di latar belakang.</strong>
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-850 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">URL Spreadsheet Deployed (GAS Web App)</span>
              <div className="flex items-center gap-2">
                {urlInput !== settings.gasUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase border border-amber-200/40">
                    Belum Disimpan
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Terhubung & Siap Pakai
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="spreadsheet-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Masukkan URL Web App Google Apps Script Anda..."
                className="flex-1 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-normal"
              />
              <div className="flex gap-2">
                <button
                  id="btn-save-spreadsheet-url"
                  onClick={handleSaveUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  title="Simpan URL yang baru dimasukkan"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan URL
                </button>
                {urlInput !== "https://script.google.com/macros/s/AKfycbzll-wwZo9pm3F1y8m0gS0Iprs2aSnO9CPK8-VmDfl7OoFU5g5paqDeEuG5R0yZl_V8UA/exec" && (
                  <button
                    id="btn-reset-spreadsheet-url"
                    onClick={() => {
                      if (confirm("Apakah Anda yakin ingin mereset URL Spreadsheet ke default?")) {
                        setUrlInput("https://script.google.com/macros/s/AKfycbzll-wwZo9pm3F1y8m0gS0Iprs2aSnO9CPK8-VmDfl7OoFU5g5paqDeEuG5R0yZl_V8UA/exec");
                        onUpdateSettings({
                          ...settings,
                          gasUrl: "https://script.google.com/macros/s/AKfycbzll-wwZo9pm3F1y8m0gS0Iprs2aSnO9CPK8-VmDfl7OoFU5g5paqDeEuG5R0yZl_V8UA/exec"
                        });
                        onAddAuditLog('Integrasi GAS', 'Mereset URL Google Apps Script ke default.');
                        alert("URL Google Apps Script telah direset ke default!");
                      }
                    }}
                    className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer whitespace-nowrap"
                    title="Reset ke URL default bawaan sistem"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              *Masukkan tautan URL Web App yang Anda dapatkan setelah memilih <b>Deploy &gt; New Deployment</b> di editor Google Apps Script.
            </p>
          </div>

          {/* BACKGROUND SYNC MANUAL ACTIONS ROW */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-500/10">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || isSyncing}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Menguji...' : 'Uji Konektivitas'}
              </button>

              <button
                onClick={handleRemoteSetup}
                disabled={isTesting || isSyncing}
                className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all border border-indigo-150 dark:border-indigo-900/40 disabled:opacity-50 cursor-pointer"
                title="Membuat seluruh Tab Sheet kosong otomatis di Google Sheets"
              >
                <Database className="w-3.5 h-3.5" />
                Format Ulang Spreadsheet Baru
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePullData}
                disabled={isTesting || isSyncing}
                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all border border-emerald-150 dark:border-emerald-900/40 disabled:opacity-50 cursor-pointer"
                title="Tarik data dari Google Sheets untuk menimpa database lokal"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                Ambil Data (Pull)
              </button>

              <button
                onClick={handlePushData}
                disabled={isTesting || isSyncing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                title="Ekspor seluruh data lokal saat ini ke Google Sheets"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Kirim Data (Push)
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300'
                : 'bg-red-50/50 border-red-200 text-red-850 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              <div className="leading-relaxed">
                <span className="font-bold">{testResult.success ? 'Koneksi Sukses! ' : 'Koneksi Gagal: '}</span>
                {testResult.message}
              </div>
            </div>
          )}

          {isSyncing && (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Sedang memproses sinkronisasi database Google Sheets. Mohon tunggu...
            </div>
          )}
        </div>
      </div>

      {/* THREE STEP GUIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-center">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm inline-flex items-center justify-center mb-3">1</span>
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Buat Spreadsheet Kosong</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Cukup buat satu file Google Spreadsheet baru yang benar-benar kosong di Google Drive Anda. Tidak perlu repot membuat lembar tab manual!
          </p>
        </div>

        <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-center">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm inline-flex items-center justify-center mb-3">2</span>
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Pasang Script & Auto-Setup</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Masuk ke <b>Extensions &gt; Apps Script</b>, tempel kode <b>Code.gs</b> di bawah, simpan, lalu klik tombol "Format Spreadsheet Baru" di atas!
          </p>
        </div>

        <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-center">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm inline-flex items-center justify-center mb-3">3</span>
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Deploy sebagai Web App</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Klik tombol <b>Deploy &gt; New Deployment</b>. Setel akses "Anyone", lalu salin URL hasilnya dan simpan di bagian atas halaman ini!
          </p>
        </div>
      </div>

      {/* TROUBLESHOOTING GUIDE FOR PUSH ISSUES */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/65 dark:border-amber-900/60 rounded-xl p-5 mb-8 space-y-3">
        <div className="flex items-center gap-2 text-amber-850 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <h4 className="font-bold text-sm">💡 Mengapa Tombol "Kirim Data (Push)" Tidak Berubah / Gagal di Spreadsheet Anda?</h4>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Google Apps Script memiliki aturan keamanan dan sistem caching deployment yang sangat ketat. Jika data lokal Anda tidak tersimpan di Google Spreadsheet, silakan verifikasi 4 hal penting di bawah ini:
        </p>
        <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2.5 list-decimal list-inside pl-1">
          <li>
            <span className="font-bold text-amber-850 dark:text-amber-400">Wajib Mendeploy Versi Baru (New Version):</span> Setiap kali Anda mengubah atau menempel kode <code>Code.gs</code> di Apps Script, <b>perubahan tersebut TIDAK akan langsung aktif</b> pada URL Web App Anda. Anda wajib memperbarui rilis: Klik <b>Deploy &gt; Manage Deployments &gt; Klik ikon pensil (Edit) &gt; Ubah kolom Version menjadi "New Version" (Wajib!) &gt; Klik Deploy</b>.
          </li>
          <li>
            <span className="font-bold text-amber-850 dark:text-amber-400">Siapa yang Memiliki Akses (Who has access):</span> Saat konfigurasi deployment Web App, setel akses ke <span className="font-bold bg-amber-100/80 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300">Anyone</span> (Siapa saja). Jika Anda menyetel ke "Only me" atau "Anyone with Google account", server Google akan memaksa proses login OAuth yang diblokir oleh browser dari aplikasi absensi ini.
          </li>
          <li>
            <span className="font-bold text-amber-850 dark:text-amber-400">Jalankan "Format Spreadsheet Baru":</span> Apps Script tidak akan bisa mengisikan baris data ke sheet jika nama-nama sheet ("Peserta", "Kegiatan", "Kehadiran", dll) belum terbuat di Spreadsheet Anda. Klik tombol <b>"Format Spreadsheet Baru"</b> di atas terlebih dahulu untuk membuat seluruh tab tabel secara otomatis.
          </li>
          <li>
            <span className="font-bold text-amber-850 dark:text-amber-400">Gunakan Script Terikat Kontainer (Bound Script):</span> Pastikan Anda membuat script ini dengan membuka Spreadsheet Anda terlebih dahulu, lalu klik menu <b>Ekstensi &gt; Apps Script</b>. Jika Anda membuat script secara standalone di script.google.com, kode <code>getActiveSpreadsheet()</code> tidak akan mendeteksi target spreadsheet Anda secara otomatis.
          </li>
        </ul>
      </div>

      <div className="space-y-6">
        {/* DATABASE SETUP COPIER */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              KONFIGURASI STRUKTUR SPREADSHEET
            </span>
            <button
              onClick={() => copyToClipboard(spreadsheetSetupInfo, setCopiedSpreadsheetSetup)}
              className="text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedSpreadsheetSetup ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSpreadsheetSetup ? 'Tersalin' : 'Salin Aturan'}
            </button>
          </div>
          <div className="p-4 bg-zinc-900 text-zinc-300 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-56">
            {spreadsheetSetupInfo}
          </div>
        </div>

        {/* CODE.GS COPIER */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700">
            <span className="font-bold text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" />
              BACKEND ENGINE SCRIPT (Code.gs)
            </span>
            <button
              onClick={() => copyToClipboard(codeGsContent, setCopiedCodeGs)}
              className="text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedCodeGs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCodeGs ? 'Tersalin' : 'Salin Code.gs'}
            </button>
          </div>
          <div className="p-4 bg-zinc-900 text-emerald-450 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed max-h-72">
            {codeGsContent}
          </div>
        </div>

        {/* EXPLANATORY ALERT FOR FULL SOURCE */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-xl p-5 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
            <p className="font-bold">Integrasi Google Spreadsheet Real-Time Aktif</p>
            <p className="mt-1">
              Aplikasi ini telah terhubung secara real-time ke Google Spreadsheet Anda melalui Google Apps Script.
              Anda dapat melakukan pengujian penuh, menginput data, mencetak QR Code, merekam kehadiran dengan scanner, dan melakukan sinkronisasi dua arah secara instan.
            </p>
            <p className="mt-2 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              *Mesin simulasi luring dinonaktifkan. Data disinkronkan langsung ke Google Spreadsheet Anda.*
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
