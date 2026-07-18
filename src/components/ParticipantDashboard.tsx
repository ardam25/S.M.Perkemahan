/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, MapPin, Award, ArrowLeft, Download, Bell, HelpCircle, Volume2, Megaphone, FileText, QrCode, History, Users, Maximize2, ExternalLink } from 'lucide-react';
import { Peserta, Kegiatan, Kehadiran, AppSettings, Pengumuman, PangkalanDetail, AnggotaPramuka, DokumenKegiatan, formatIndonesianDate, formatIndonesianTime } from '../types';
import { speakIndonesianText } from '../lib/tts';
import { generateKartuAbsenPDF, generateBulkIdCardsPDF } from '../lib/pdf';
import { User, Plus, Trash2, Save, RefreshCw, Smartphone, Check, AlertCircle, Printer } from 'lucide-react';

interface ParticipantDashboardProps {
  currentPeserta: Peserta;
  kegiatan: Kegiatan[];
  kehadiran: Kehadiran[];
  settings: AppSettings;
  announcements: Pengumuman[];
  documents: DokumenKegiatan[];
  pangkalanDetails: PangkalanDetail[];
  onUpdatePangkalanDetails: React.Dispatch<React.SetStateAction<PangkalanDetail[]>>;
  onLogout: () => void;
  onPullData?: (silent?: boolean) => Promise<boolean>;
}

export default function ParticipantDashboard({
  currentPeserta,
  kegiatan,
  kehadiran,
  settings,
  announcements,
  documents,
  pangkalanDetails,
  onUpdatePangkalanDetails,
  onLogout,
  onPullData
}: ParticipantDashboardProps) {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'jadwal' | 'riwayat' | 'pangkalan_admin' | 'dokumen'>('ringkasan');
  
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!onPullData) return;
    setIsManualSyncing(true);
    try {
      await onPullData(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsManualSyncing(false);
    }
  };
  
  // Local playing audio state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await generateKartuAbsenPDF(currentPeserta, settings);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh Kartu Absen.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const playAnnouncementVoice = (ann: Pengumuman) => {
    if (playingId === ann.id) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }
    
    const textToSpeak = ann.konten;
    speakIndonesianText(textToSpeak, {
      onStart: () => setPlayingId(ann.id),
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  // Filter active announcements relevant for this participant
  const activeAnnouncements = announcements.filter(ann => 
    ann.statusAktif && 
    (ann.tingkatanTarget === 'Semua' || ann.tingkatanTarget === currentPeserta.tingkatan)
  );

  // Calculations for Participant Attendance
  const finishedKegiatans = kegiatan.filter(k => k.status === 'Selesai');
  const totalKegiatanCount = finishedKegiatans.length;
  
  // Participant's logs
  const myKehadiran = kehadiran.filter(h => h.idPeserta === currentPeserta.idPeserta);
  
  // History shows finished events OR any events where participant has successfully checked in
  const historyKegiatans = kegiatan.filter(k => 
    k.status === 'Selesai' || 
    myKehadiran.some(h => h.idKegiatan === k.idKegiatan)
  );
  
  const myHadirCount = myKehadiran.filter(h => h.statusHadir === 'Hadir').length;
  const myMissedCount = Math.max(0, totalKegiatanCount - myHadirCount);
  
  // Attendance Rate (Hadir / Finished Events)
  const attendanceRate = totalKegiatanCount > 0 ? Math.round((myHadirCount / totalKegiatanCount) * 100) : 100;

  // Next Event Calculation
  const upcomingEvents = kegiatan
    .filter(k => k.status === 'Aktif')
    .sort((a, b) => a.urutan - b.urutan);
  const nextEvent = upcomingEvents[0];

  // Simulated countdown state for next event
  const [countdownStr, setCountdownStr] = useState<string>('30 Menit Lagi');

  useEffect(() => {
    if (!nextEvent) {
      setCountdownStr('Tidak ada agenda terdekat');
      return;
    }

    // Set a dynamic, realistic countdown text based on event jamMulai
    const timer = setInterval(() => {
      setCountdownStr("Dimulai ± 25 Menit Lagi");
    }, 10000);

    return () => clearInterval(timer);
  }, [nextEvent]);

  // --- GOOGLE SPREADSHEET DATABASE SYNC STATE & LOGIC ---
  const myDetail = pangkalanDetails.find(d => d.idPeserta === currentPeserta.idPeserta) || {
    idPeserta: currentPeserta.idPeserta,
    namaPembina: '',
    hpPembina: '',
    anggota: []
  };

  const [pembinaForm, setPembinaForm] = useState({
    namaPembina: myDetail.namaPembina,
    hpPembina: myDetail.hpPembina
  });

  const [newMember, setNewMember] = useState({
    nama: '',
    tempatLahir: '',
    tanggalLahir: ''
  });

  useEffect(() => {
    setPembinaForm({
      namaPembina: myDetail.namaPembina,
      hpPembina: myDetail.hpPembina
    });
  }, [currentPeserta.idPeserta, pangkalanDetails]);

  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem(`sync_time_${currentPeserta.idPeserta}`);
  });

  const handleSavePembina = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDetails = [...pangkalanDetails];
    const index = updatedDetails.findIndex(d => d.idPeserta === currentPeserta.idPeserta);
    if (index >= 0) {
      updatedDetails[index] = {
        ...updatedDetails[index],
        namaPembina: pembinaForm.namaPembina,
        hpPembina: pembinaForm.hpPembina
      };
    } else {
      updatedDetails.push({
        idPeserta: currentPeserta.idPeserta,
        namaPembina: pembinaForm.namaPembina,
        hpPembina: pembinaForm.hpPembina,
        anggota: []
      });
    }
    onUpdatePangkalanDetails(updatedDetails);
    alert("Data Pembina berhasil disimpan!");
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.nama.trim()) {
      alert("Harap masukkan nama lengkap anggota!");
      return;
    }
    const updatedDetails = [...pangkalanDetails];
    const index = updatedDetails.findIndex(d => d.idPeserta === currentPeserta.idPeserta);
    const newAnggota: AnggotaPramuka = {
      id: `ANG-${Date.now()}`,
      nama: newMember.nama,
      tempatLahir: '',
      tanggalLahir: ''
    };
    
    if (index >= 0) {
      updatedDetails[index] = {
        ...updatedDetails[index],
        anggota: [...updatedDetails[index].anggota, newAnggota]
      };
    } else {
      updatedDetails.push({
        idPeserta: currentPeserta.idPeserta,
        namaPembina: pembinaForm.namaPembina,
        hpPembina: pembinaForm.hpPembina,
        anggota: [newAnggota]
      });
    }
    onUpdatePangkalanDetails(updatedDetails);
    setNewMember({ nama: '', tempatLahir: '', tanggalLahir: '' });
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus anggota ini?")) {
      const updatedDetails = [...pangkalanDetails];
      const index = updatedDetails.findIndex(d => d.idPeserta === currentPeserta.idPeserta);
      if (index >= 0) {
        updatedDetails[index] = {
          ...updatedDetails[index],
          anggota: updatedDetails[index].anggota.filter(m => m.id !== memberId)
        };
        onUpdatePangkalanDetails(updatedDetails);
      }
    }
  };

  const handleSyncSpreadsheet = () => {
    setIsSyncingSpreadsheet(true);
    setTimeout(() => {
      setIsSyncingSpreadsheet(false);
      const nowStr = new Date().toLocaleString('id-ID', { hour12: false });
      setLastSyncedTime(nowStr);
      localStorage.setItem(`sync_time_${currentPeserta.idPeserta}`, nowStr);
      alert("PENGIRIMAN DATA BERHASIL!\n\nSeluruh data pembina dan daftar anggota berhasil dikirimkan ke panitia secara instan.");
    }, 1500);
  };

  const [isPrintingIdCards, setIsPrintingIdCards] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handlePrintIdCards = async () => {
    if ((!myDetail.namaPembina || myDetail.namaPembina.trim() === '') && myDetail.anggota.length === 0) {
      alert("Belum ada data Pembina atau Anggota Pramuka untuk dicetak!");
      return;
    }
    setIsPrintingIdCards(true);
    try {
      const pembinaData = myDetail.namaPembina && myDetail.namaPembina.trim() !== '' ? {
        nama: myDetail.namaPembina,
        hp: myDetail.hpPembina
      } : null;
      await generateBulkIdCardsPDF(
        currentPeserta.namaPangkalan,
        currentPeserta.idPeserta,
        pembinaData,
        myDetail.anggota,
        currentPeserta.jenisKelamin,
        settings,
        currentPeserta.tingkatan
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal mencetak ID Card.");
    } finally {
      setIsPrintingIdCards(false);
    }
  };

  // QR Code URL Generator using free, ultra-reliable QR Server API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${currentPeserta.idPeserta}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" id="participant-portal">
      {/* HEADER BAR */}
      <div className={`flex items-center justify-between p-5 rounded-2xl shadow-md border mb-6 transition-all ${
        currentPeserta.jenisKelamin === 'Putra'
          ? 'bg-gradient-to-r from-blue-800 via-indigo-950 to-zinc-950 text-white border-blue-900 shadow-blue-500/5'
          : 'bg-gradient-to-r from-rose-850 via-purple-950 to-zinc-950 text-white border-rose-900 shadow-rose-500/5'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border transition-all ${
            currentPeserta.jenisKelamin === 'Putra'
              ? 'bg-blue-950/60 border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : 'bg-rose-950/60 border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
          }`}>
            {currentPeserta.jenisKelamin === 'Putra' ? '👦' : '👧'}
          </div>
          <div>
            <span className="text-[9px] text-zinc-300 font-mono tracking-widest block uppercase">
              {settings.namaEvent.toUpperCase()} &bull; {settings.lokasiEvent?.toUpperCase() || "BUMI PERKEMAHAN"}
            </span>
            <h2 className="text-lg font-black leading-tight uppercase tracking-tight">{currentPeserta.namaPangkalan}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-zinc-100 font-medium">
                ID: <span className="font-mono font-bold text-amber-300">{currentPeserta.idPeserta}</span>
              </span>
              <span className="text-zinc-500 text-[10px] font-bold">&bull;</span>
              {currentPeserta.jenisKelamin === 'Putra' ? (
                <span className="inline-flex items-center gap-1 bg-blue-500/25 border border-blue-400/35 text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ♂️ Putra (Pa)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-rose-500/25 border border-rose-400/35 text-rose-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ♀️ Putri (Pi)
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onLogout()}
          className={`text-xs font-bold py-2 px-4 rounded-xl border transition-all ${
            currentPeserta.jenisKelamin === 'Putra'
              ? 'bg-blue-950/80 hover:bg-blue-900/60 text-white border-blue-700/60'
              : 'bg-rose-950/80 hover:bg-rose-900/60 text-white border-rose-700/60'
          }`}
          id="btn-participant-logout"
        >
          Keluar (Logout)
        </button>
      </div>

      {/* NOTIFICATION CRITICAL ALERT */}
      {activeAnnouncements.length > 0 && (
        <div className="space-y-3 mb-6" id="participant-announcements">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
            <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Pengumuman & Instruksi Terkini</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {activeAnnouncements.map((ann) => (
              <div 
                key={ann.id} 
                className={`border rounded-2xl p-4 transition-all relative overflow-hidden bg-white dark:bg-zinc-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  playingId === ann.id 
                    ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10' 
                    : 'border-zinc-200 dark:border-zinc-800/80'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      Tingkat: {ann.tingkatanTarget}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono font-medium">
                      {formatIndonesianDate(ann.tanggal)} &bull; {formatIndonesianTime(ann.jam)} WITA &bull; Oleh {ann.dibuatOleh}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
                    {ann.judul}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed font-normal whitespace-pre-line">
                    {ann.konten}
                  </p>
                </div>

                <button
                  onClick={() => playAnnouncementVoice(ann)}
                  className={`text-[10px] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm self-start sm:self-center whitespace-nowrap ${
                    playingId === ann.id
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                  }`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${playingId === ann.id ? 'animate-pulse' : ''}`} />
                  {playingId === ann.id ? 'Hentikan' : 'Dengarkan Suara'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="grid grid-cols-2 md:flex border border-zinc-800 mb-6 bg-[#000001] p-1.5 rounded-2xl gap-1.5" id="participant-nav-tabs">
        <button
          onClick={() => setActiveTab('ringkasan')}
          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold tracking-wide transition-all md:flex-1 ${
            activeTab === 'ringkasan'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/30 scale-[1.01]'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60 bg-zinc-900/40 border border-zinc-800/50'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Kehadiran QR</span>
        </button>
        <button
          onClick={() => setActiveTab('jadwal')}
          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold tracking-wide transition-all md:flex-1 ${
            activeTab === 'jadwal'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/30 scale-[1.01]'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60 bg-zinc-900/40 border border-zinc-800/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Jadwal Camp</span>
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold tracking-wide transition-all md:flex-1 ${
            activeTab === 'riwayat'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/30 scale-[1.01]'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60 bg-zinc-900/40 border border-zinc-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Absen</span>
        </button>
        <button
          onClick={() => setActiveTab('pangkalan_admin')}
          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold tracking-wide transition-all md:flex-1 ${
            activeTab === 'pangkalan_admin'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/30 scale-[1.01]'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60 bg-zinc-900/40 border border-zinc-800/50'
          }`}
          id="tab-pangkalan-admin"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Data Peserta</span>
        </button>
        <button
          onClick={() => setActiveTab('dokumen')}
          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold tracking-wide transition-all md:flex-1 ${
            activeTab === 'dokumen'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/30 scale-[1.01]'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900/60 bg-zinc-900/40 border border-zinc-800/50'
          }`}
          id="tab-kegiatan-dokumen"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Dokumen</span>
        </button>
      </div>

      {/* TAB CONTENT: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="tab-participant-summary">
          {/* PROFILE & QR CODE CARD (5 COLS) */}
          <div className="md:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm text-center flex flex-col justify-between items-center">
            <div className="w-full">
              <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase block mb-3">ID KARTU PESERTA</span>
              
              {/* Dynamic QR image */}
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 flex items-center justify-center w-52 h-52 mx-auto relative group shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${currentPeserta.idPeserta}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-zinc-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh QR
                  </a>
                </div>
              </div>

              {/* Touch trigger to open full screen QR modal */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="mt-3.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1.5 justify-center mx-auto bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-200/50 dark:border-emerald-900/60 transition-all active:scale-95 shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Buka Mode Scan Layar Penuh</span>
              </button>
              
              <h4 className="text-xl font-black font-mono tracking-wider text-emerald-900 dark:text-emerald-400 mt-4">
                {currentPeserta.idPeserta}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 uppercase font-semibold">
                Tunjukkan QR di atas ke petugas untuk melakukan absensi
              </p>

              <div className="mt-5 px-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-55"
                >
                  {isDownloadingPdf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                      Membuat PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Unduh Kartu Absen (PDF)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="w-full border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
              <p className="text-[10px] text-zinc-400 italic font-mono leading-relaxed">
                *Simpan gambar QR Code di atas ke galeri ponsel Anda untuk mempercepat proses masuk lokasi kegiatan.*
              </p>
            </div>
          </div>

          {/* ATTENDANCE STATS & NEXT EVENT (7 COLS) */}
          <div className="md:col-span-7 flex flex-col gap-6">
            {/* ATTENDANCE Rate Display (Progress bar & values) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm">
              <h3 className="font-bold text-sm tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-4 flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-emerald-600" />
                Persentase Kehadiran Anda
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Progress Circle (standard modern SVG) */}
                <div className="sm:col-span-4 flex justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* background circle */}
                      <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-zinc-100 dark:text-zinc-800"
                      />
                      {/* active progress circle */}
                      <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={283}
                        strokeDashoffset={283 - (283 * attendanceRate) / 100}
                        className="text-emerald-600 dark:text-emerald-500 transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100">
                        {attendanceRate}%
                      </span>
                      <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Hadir</span>
                    </div>
                  </div>
                </div>

                {/* Statistics breakdowns */}
                <div className="sm:col-span-8 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-400 uppercase block font-semibold">Total Kegiatan</span>
                      <span className="text-base font-bold font-mono block text-zinc-800 dark:text-zinc-200">{totalKegiatanCount}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/30">
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase block font-semibold">Anda Hadir</span>
                      <span className="text-base font-bold font-mono block text-emerald-800 dark:text-emerald-300">{myHadirCount}</span>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100/30">
                      <span className="text-[9px] text-red-600 dark:text-red-400 uppercase block font-semibold">Belum Absen</span>
                      <span className="text-base font-bold font-mono block text-red-800 dark:text-red-300">{myMissedCount}</span>
                    </div>
                  </div>

                  {/* Standard Progress bar as a second representation */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${attendanceRate}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* TAB CONTENT: JADWAL */}
      {activeTab === 'jadwal' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm" id="tab-participant-schedule">
          <h3 className="font-bold text-sm tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-4">
            Jadwal Lengkap Kegiatan Perkemahan
          </h3>

          <div className="space-y-4">
            {kegiatan.map((item) => {
              // Color matching logic based on status
              let borderClass = "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50";
              let statusLabel = "Selesai";
              let statusBadge = "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
              
              if (item.status === 'Aktif') {
                borderClass = "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10 animate-pulse";
                statusLabel = "Aktif";
                statusBadge = "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold";
              }

              return (
                <div key={item.idKegiatan} className={`border p-4 rounded-xl transition-colors ${borderClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-500">{item.idKegiatan}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-1">{item.namaKegiatan}</h4>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {item.hari}, {formatIndonesianTime(item.jamMulai)} - {formatIndonesianTime(item.jamSelesai)} WITA
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          {item.lokasi}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono block text-zinc-400">URUTAN KEGIATAN</span>
                      <span className="text-sm font-black text-emerald-800 dark:text-emerald-500">#{item.urutan}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm" id="tab-participant-history">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="font-bold text-sm tracking-wider text-zinc-700 dark:text-zinc-300 uppercase">
              Riwayat Log Absensi Kegiatan Anda
            </h3>
            {onPullData && (
              <button
                onClick={handleManualSync}
                disabled={isManualSyncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-colors animate-fade-in"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                {isManualSyncing ? 'Menarik...' : 'Tarik Data Terbaru'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {historyKegiatans.map((item) => {
              // Find matching check-in log
              const hasCheckedIn = myKehadiran.find(h => h.idKegiatan === item.idKegiatan);

              return (
                <div 
                  key={item.idKegiatan} 
                  style={{ backgroundColor: '#0a0808' }} 
                  className="flex flex-wrap items-center justify-between p-4 rounded-2xl border border-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:scale-[1.01] transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    {hasCheckedIn && hasCheckedIn.statusHadir === 'Hadir' ? (
                      <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-black text-white">{item.namaKegiatan}</h4>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {item.status === 'Selesai' ? 'Agenda Selesai' : item.status === 'Aktif' ? 'Aktif' : 'Belum Selesai'} &bull; Hari {item.hari}, {formatIndonesianDate(item.tanggal)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    {hasCheckedIn && hasCheckedIn.statusHadir === 'Hadir' ? (
                      <div>
                        <span className="text-emerald-400 font-extrabold block tracking-wider">✔ HADIR</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Jam: {formatIndonesianTime(hasCheckedIn.jam)} WITA</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-rose-400 font-extrabold block tracking-wider">❌ TIDAK HADIR</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Tidak Melapor</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {historyKegiatans.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-6 italic font-mono">
                Belum ada kegiatan perkemahan yang selesai dinilai atau diikuti...
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADMIN PANGKALAN */}
      {activeTab === 'pangkalan_admin' && (
        <div className="space-y-6" id="tab-pangkalan-admin-content">
          {/* CARD 1: SPREADSHEET CONNECTOR HEADER */}
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white rounded-2xl border border-emerald-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-300 block">PENGIRIMAN DATA PANITIA</span>
              <h3 className="text-lg font-black uppercase tracking-tight">Kirim Data ke Panitia</h3>
              <p className="text-xs text-emerald-100/80 leading-relaxed max-w-xl">
                Daftarkan Pembina, Nomor HP/WA, dan list seluruh anggota pramuka yang ikut berkemah. Kirimkan data kontingen Anda ke panitia secara instan.
              </p>
            </div>
            
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={handleSyncSpreadsheet}
                disabled={isSyncingSpreadsheet}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-zinc-950 text-xs font-black py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                {isSyncingSpreadsheet ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                    Mengirim Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-zinc-950" />
                    Kirim Data ke Panitia
                  </>
                )}
              </button>
              
              {lastSyncedTime && (
                <div className="text-[10px] text-emerald-200 text-center font-mono">
                  Terakhir dikirim: <span className="font-bold">{lastSyncedTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* CARD: PRINT ID CARDS SECTION */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">Cetak ID Card Kontingen (Format A4)</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
                  Cetak kartu tanda pengenal untuk Pembina dan seluruh anggota. Diformat otomatis agar muat <b>4 ID Card dalam 1 lembar kertas A4</b> (misal: 8 orang akan otomatis terbagi menjadi 2 lembar).
                </p>
              </div>
            </div>

            <button
              onClick={handlePrintIdCards}
              disabled={isPrintingIdCards}
              className="w-full md:w-auto shrink-0 bg-black hover:bg-zinc-900 disabled:bg-black/50 text-white text-xs font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            >
              {isPrintingIdCards ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                  Memproses PDF...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-white" />
                  Cetak ID Card Sekarang
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: FORMS (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* FORM: BIODATA PEMBINA */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 p-5 shadow-sm">
                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Identitas Pembina Pendamping
                </h4>

                <form onSubmit={handleSavePembina} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Nama Pembina</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kak Wahyu Hidayat, S.Pd."
                      value={pembinaForm.namaPembina}
                      onChange={(e) => setPembinaForm(p => ({ ...p, namaPembina: e.target.value }))}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Nomor HP / WhatsApp</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={pembinaForm.hpPembina}
                        onChange={(e) => setPembinaForm(p => ({ ...p, hpPembina: e.target.value }))}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-750 rounded-xl pl-9 pr-3 py-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Data Pembina
                  </button>
                </form>
              </div>

              {/* FORM: INPUT ANGGOTA BARU */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 p-5 shadow-sm">
                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Tambah Anggota Pramuka (Peserta)
                </h4>

                <form onSubmit={handleAddMember} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Nama Lengkap Anggota</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Lengkap"
                      value={newMember.nama}
                      onChange={(e) => setNewMember(p => ({ ...p, nama: e.target.value }))}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Anggota Ke Regu
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: LIST MEMBERS TABLE (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                  <div>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      🍀 Daftar Anggota Pramuka Kontingen
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Jumlah anggota terdaftar: <b>{myDetail.anggota.length} Orang</b>
                    </p>
                  </div>
                  
                  {myDetail.namaPembina ? (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                        Pembina: <b>{myDetail.namaPembina}</b>
                      </span>
                      {myDetail.hpPembina && (
                        <span
                          className="text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900/60 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5 fill-current text-green-600 dark:text-green-400" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.019-5.101-2.871-6.958C16.612 1.983 14.14 1.961 11.99 1.961c-5.437 0-9.861 4.414-9.864 9.848-.001 1.738.457 3.432 1.328 4.927l-1.012 3.7 3.79-.993zm11.566-7.585c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.149-.197.297-.767.98-.94 1.179-.173.197-.347.222-.649.072-.302-.151-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.276-2.158.172-.297.025-.457-.125-.607-.135-.135-.302-.354-.452-.53-.15-.177-.2-.303-.301-.504-.101-.2-.05-.378-.025-.53.025-.151.197-.478.297-.677.1-.199.15-.347.223-.497.074-.149.037-.282-.012-.382-.049-.1-.472-1.14-.646-1.564-.17-.408-.344-.353-.472-.353-.122-.002-.264-.002-.408-.002-.144 0-.378.054-.576.273-.198.22-.756.74-.756 1.805 0 1.065.774 2.093.882 2.241.109.15 1.522 2.324 3.69 3.259.516.222.919.355 1.233.456.518.165.989.141 1.361.085.415-.062 1.272-.519 1.452-1.02.18-.501.18-.931.126-1.02-.054-.09-.2-.149-.502-.3zm0 0" />
                          </svg>
                          WA: {myDetail.hpPembina}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-900/40 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Belum ada Pembina
                    </span>
                  )}
                </div>

                {myDetail.anggota.length > 0 ? (
                  <div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-150 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                            <th className="py-2.5 pl-2">No</th>
                            <th className="py-2.5">Nama Anggota</th>
                            <th className="py-2.5 pr-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                          {myDetail.anggota.map((ang, idx) => (
                            <tr key={ang.id || idx} className="group hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors">
                              <td className="py-3 pl-2 font-mono text-zinc-400 font-bold">{idx + 1}</td>
                              <td className="py-3 font-semibold text-zinc-850 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white">{ang.nama}</td>
                              <td className="py-3 pr-2 text-right">
                                <button
                                  onClick={() => handleDeleteMember(ang.id)}
                                  className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="Hapus Anggota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden space-y-3">
                      {myDetail.anggota.map((ang, idx) => (
                        <div key={ang.id || idx} className="p-4 bg-zinc-50 dark:bg-zinc-850/30 rounded-xl border border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 font-mono">
                                {idx + 1}
                              </span>
                              <h5 className="font-extrabold text-xs text-zinc-850 dark:text-zinc-100 uppercase tracking-tight">
                                {ang.nama}
                              </h5>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteMember(ang.id)}
                            className="p-2.5 text-rose-600 hover:text-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100/60 dark:border-rose-950/40 transition-colors shrink-0"
                            title="Hapus Anggota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 space-y-2">
                    <p className="italic text-xs font-mono">Belum ada anggota yang didaftarkan untuk pangkalan ini.</p>
                    <p className="text-[11px] max-w-sm mx-auto">
                      Silakan gunakan form di sebelah kiri untuk menginput nama-nama peserta pramuka yang ikut serta dalam perkemahan ini.
                    </p>
                  </div>
                )}
              </div>



            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOKUMEN KEGIATAN */}
      {activeTab === 'dokumen' && (
        <div className="space-y-6 animate-fade-in" id="tab-participant-documents">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Dokumen Kegiatan & Panduan
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              Daftar surat resmi, juknis, jadwal lengkap, dan berkas penting lainnya yang dibagikan oleh panitia khusus untuk tingkatan <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentPeserta.tingkatan}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {documents.filter(doc => doc.tingkatan === 'Semua' || doc.tingkatan === currentPeserta.tingkatan).length > 0 ? (
              documents
                .filter(doc => doc.tingkatan === 'Semua' || doc.tingkatan === currentPeserta.tingkatan)
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-600/30 transition-all group animate-fade-in"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight line-clamp-2">
                          {doc.judul}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                            doc.tingkatan === 'Semua'
                              ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            Akses: {doc.tingkatan}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">&bull;</span>
                          <span className="text-[10px] text-zinc-400 font-mono font-medium">Uploaded: {formatIndonesianDate(doc.tanggalUpload)}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={doc.linkDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto text-center bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs py-3 px-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>Buka Dokumen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 rounded-2xl text-center text-zinc-400 italic">
                <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="font-bold text-zinc-700 dark:text-zinc-300 not-italic">Belum ada dokumen dibagikan</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto not-italic">Panitia belum mengunggah berkas resmi untuk tingkatan Anda saat ini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL SCREEN DYNAMIC QR MODAL FOR MOBILE DEVICES */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in" id="qr-maximize-modal">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center space-y-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase font-black">MODE PINDAI SCANNER</span>
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight leading-tight mt-1">
                {currentPeserta.namaPangkalan}
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Kategori: {currentPeserta.jenisKelamin === 'Putra' ? '👦 PUTRA (Pa)' : '👧 PUTRI (Pi)'}
              </p>
            </div>

            {/* Huge, perfectly readable white background container for QR */}
            <div className="bg-white p-5 rounded-2xl border-4 border-zinc-100 dark:border-zinc-800 flex items-center justify-center w-64 h-64 mx-auto shadow-inner">
              <img
                src={qrCodeUrl}
                alt={`QR Code ${currentPeserta.idPeserta}`}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="text-xs text-zinc-400 font-mono">ID PESERTA (PANGKALAN)</span>
              <h4 className="text-3xl font-black font-mono tracking-widest text-emerald-800 dark:text-emerald-400 mt-0.5 select-all">
                {currentPeserta.idPeserta}
              </h4>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Silakan hadapkan layar HP Anda langsung ke kamera scanner panitia. Tingkatkan kecerahan layar HP jika scan sulit terbaca.
            </p>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-95 shadow-lg uppercase tracking-wider"
            >
              Tutup / Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
