/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Users, Trophy, Radio, Clock, Calendar, CheckCircle, Navigation } from 'lucide-react';
import { Peserta, Kegiatan, Kehadiran, AppSettings, formatIndonesianDate, formatIndonesianTime } from '../types';

interface PublicDashboardProps {
  peserta: Peserta[];
  kegiatan: Kegiatan[];
  kehadiran: Kehadiran[];
  settings: AppSettings;
}

export default function PublicDashboard({ peserta, kegiatan, kehadiran: rawKehadiran, settings }: PublicDashboardProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const kehadiran = React.useMemo(() => rawKehadiran.filter(h => h.statusHadir === 'Hadir'), [rawKehadiran]);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter Active and Next Activities
  const activeEvents = kegiatan.filter(k => k.status === 'Aktif');
  const finishedEvents = kegiatan.filter(k => k.status === 'Selesai');
  
  // Find next event (first upcoming activity in urutan order that is not finished)
  const nextEvent = kegiatan
    .filter(k => k.status === 'Aktif')
    .sort((a, b) => a.urutan - b.urutan)[0] || 
    kegiatan
    .filter(k => k.status !== 'Selesai')
    .sort((a, b) => a.urutan - b.urutan)[0];

  // Calculated Stats
  const totalBoys = peserta.filter(p => p.jenisKelamin === 'Putra').length;
  const totalGirls = peserta.filter(p => p.jenisKelamin === 'Putri').length;
  const totalPesertaCount = peserta.length;

  // Attendance logged today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayKehadiran = kehadiran.filter(h => h.tanggal === todayStr);

  // Pangkalan Standings Calculation
  // We rank pangkalans by their attendance rate: Total check-ins / (Total participants in that pangkalan * total finished events)
  const pangkalanList = Array.from(new Set(peserta.map(p => p.namaPangkalan)));
  const pangkalanRankings = pangkalanList.map(pangkalanName => {
    const pangkalanPeserta = peserta.filter(p => p.namaPangkalan === pangkalanName);
    const participantCount = pangkalanPeserta.length;
    
    // Total expected logs for finished events
    const expectedLogs = participantCount * finishedEvents.length;
    
    // Actual logs for finished events
    const actualLogs = kehadiran.filter(h => 
      h.namaPangkalan === pangkalanName && 
      finishedEvents.some(f => f.idKegiatan === h.idKegiatan)
    ).length;

    const rate = expectedLogs > 0 ? Math.round((actualLogs / expectedLogs) * 100) : 0;

    return {
      namaPangkalan: pangkalanName,
      pesertaCount: participantCount,
      kehadiranRate: rate,
      totalLog: actualLogs
    };
  }).sort((a, b) => b.kehadiranRate - a.kehadiranRate || b.totalLog - a.totalLog);

  // Live Stream Feed (last 5 scans)
  const latestScans = [...kehadiran].reverse().slice(0, 5);

  return (
    <div className="bg-zinc-950 text-white min-h-screen p-6 font-sans flex flex-col justify-between" id="public-projector-dashboard">
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between border-b border-emerald-900/60 pb-6 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0">
            <Shield className="w-9 h-9 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight uppercase text-emerald-400">
              DASHBOARD PUBLIK REAL-TIME
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 font-mono">
              {settings.namaEvent} &bull; <span className="text-emerald-500 font-bold">{settings.pelaksanaEvent || settings.kwartir}</span>
              {settings.lokasiEvent && <span className="text-zinc-500"> &bull; Lokasi: {settings.lokasiEvent}</span>}
            </p>
          </div>
        </div>

        {/* CLOCK & SERVER TIME */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 px-5 text-right font-mono shadow-inner shrink-0">
          <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">JAM UTAMA PERKEMAHAN</span>
          <span className="text-2xl md:text-3xl font-black text-amber-400 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500 animate-spin-slow" />
            {currentTime.toLocaleTimeString('id-ID')}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* MAIN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: ACTIVE ACTIVITIES & STATS (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-900">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Peserta</span>
                <span className="text-xl font-bold font-mono">{totalPesertaCount}</span>
                <span className="text-[10px] text-zinc-500 block">({totalBoys} Pa / {totalGirls} Pi)</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/60 text-amber-400 rounded-lg border border-amber-900">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Kegiatan</span>
                <span className="text-xl font-bold font-mono">{kegiatan.length}</span>
                <span className="text-[10px] text-zinc-500 block">({finishedEvents.length} Selesai)</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/60 text-cyan-400 rounded-lg border border-cyan-900">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Absen Hari Ini</span>
                <span className="text-xl font-bold font-mono text-cyan-400">{todayKehadiran.length}</span>
                <span className="text-[10px] text-zinc-500 block">Check-ins</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-purple-950/60 text-purple-400 rounded-lg border border-purple-900">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Rerata Disiplin</span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {pangkalanRankings.length > 0 
                    ? Math.round(pangkalanRankings.reduce((sum, p) => sum + p.kehadiranRate, 0) / pangkalanRankings.length)
                    : 0}%
                </span>
                <span className="text-[10px] text-zinc-500 block">Kehadiran Camp</span>
              </div>
            </div>
          </div>

          {/* ACTIVE ACTIVITIES & UPCOMING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* ACTIVE/ONGOING (GREEN) */}
            <div className="bg-zinc-900/40 border border-emerald-950/80 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-mono border border-emerald-800 uppercase font-black tracking-widest animate-pulse">
                    AKTIF (ACTIVE)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>

                {activeEvents.length > 0 ? (
                  <div className="space-y-4">
                    {activeEvents.slice(0, 2).map((evt) => {
                      const eventAttendees = kehadiran.filter(h => h.idKegiatan === evt.idKegiatan).length;
                      const attendancePct = totalPesertaCount > 0 ? Math.round((eventAttendees / totalPesertaCount) * 100) : 0;

                      return (
                        <div key={evt.idKegiatan} className="bg-zinc-950/80 border border-emerald-900/40 p-4 rounded-xl">
                          <h4 className="text-lg font-black text-emerald-400 leading-snug">{evt.namaKegiatan}</h4>
                          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-zinc-500" />
                            Lokasi: <b>{evt.lokasi}</b>
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                            Jam: {formatIndonesianTime(evt.jamMulai)} - {formatIndonesianTime(evt.jamSelesai)} WITA
                          </p>
                          
                          {/* Visual progress of scan */}
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                              <span>PRESENSI: {eventAttendees} / {totalPesertaCount} PESERTA</span>
                              <span className="text-emerald-400 font-bold">{attendancePct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${attendancePct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-zinc-500 flex flex-col items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs uppercase font-mono tracking-wider">TIDAK ADA KEGIATAN AKTIF</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Saat ini semua peserta berada di tenda atau waktu istirahat.</p>
                  </div>
                )}
              </div>

              {activeEvents.length > 0 && (
                <div className="mt-4 p-2 bg-emerald-950/30 text-emerald-400 rounded-lg text-center font-mono text-[11px] border border-emerald-900/40">
                  ⚠️ Silakan pimpinan regu melapor ke pos absensi untuk memindai QR Code.
                </div>
              )}
            </div>

            {/* UPCOMING ACTIVITIES (YELLOW) */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-amber-950/60 text-amber-400 px-3 py-1 rounded-full text-[10px] font-mono border border-amber-950 uppercase font-black tracking-widest">
                    KEGIATAN SELANJUTNYA (UPCOMING)
                  </span>
                </div>

                {nextEvent ? (
                  <div className="bg-zinc-950/80 border border-amber-950 p-4 rounded-xl">
                    <span className="text-[9px] font-mono tracking-wider bg-amber-950/80 text-amber-400 px-2 py-0.5 rounded uppercase">
                      HARI {nextEvent.hari.toUpperCase()}, {formatIndonesianDate(nextEvent.tanggal)}
                    </span>
                    <h4 className="text-base font-black text-amber-400 mt-2 leading-tight">{nextEvent.namaKegiatan}</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Lokasi: <b>{nextEvent.lokasi}</b>
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      Rencana Mulai: {formatIndonesianTime(nextEvent.jamMulai)} WITA
                    </p>
                    
                    {/* Visual Countdown representation */}
                    <div className="mt-4 p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-500 font-bold uppercase text-[10px]">Persiapan:</span>
                      <span className="text-white animate-pulse">Sesuai Jadwal Lapangan</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-zinc-500 flex flex-col items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-xs uppercase font-mono tracking-wider">Agenda Selesai</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Seluruh rangkaian perkemahan telah terjadwal.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 text-zinc-500 text-[10px] font-mono leading-relaxed">
                *Agenda di atas disinkronkan otomatis dari pangkalan data panitia perkemahan.*
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TROOPS STANDINGS & LIVE SCAN FEED (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* PANGKALAN DISCIPLINE TROPHY */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 mb-4">
                <Trophy className="w-4.5 h-4.5 text-amber-400" />
                Peringkat Kehadiran Regu / Pangkalan
              </h3>

              {/* GAMIFIED PODIUM (From Reference Image) */}
              <div className="flex items-end justify-center gap-2 pt-2 pb-4 border-b border-zinc-800/60 mb-4 bg-zinc-950/40 rounded-2xl p-3">
                {/* 2nd Place */}
                {pangkalanRankings[1] ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-slate-300 flex items-center justify-center text-base font-bold shadow-lg text-slate-100">
                        🥈
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-zinc-950 text-[10px] font-black flex items-center justify-center border border-white">
                        2
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-200 text-center block truncate w-16" title={pangkalanRankings[1].namaPangkalan}>
                      {pangkalanRankings[1].namaPangkalan.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">{pangkalanRankings[1].kehadiranRate}%</span>
                    <div className="w-full bg-zinc-800/75 border-t border-slate-400/30 h-14 rounded-t-xl mt-2 flex items-center justify-center shadow-inner">
                      <span className="text-[10px] text-slate-300 font-bold font-mono">2nd</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}

                {/* 1st Place */}
                {pangkalanRankings[0] ? (
                  <div className="flex-1 flex flex-col items-center scale-105 z-10">
                    <div className="relative mb-2">
                      <div className="w-14 h-14 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-lg font-bold shadow-xl glow-yellow text-amber-300">
                        🥇
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black flex items-center justify-center border border-white">
                        1
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-300 text-center block truncate w-20" title={pangkalanRankings[0].namaPangkalan}>
                      {pangkalanRankings[0].namaPangkalan.split(' ')[0]}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-black">{pangkalanRankings[0].kehadiranRate}%</span>
                    <div className="w-full bg-emerald-600 border-t border-amber-400/40 h-20 rounded-t-xl mt-2 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(110,68,255,0.4)]">
                      <span className="text-[9px] text-amber-300 font-black font-mono">👑 WIN</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}

                {/* 3rd Place */}
                {pangkalanRankings[2] ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-amber-800/40 flex items-center justify-center text-sm font-bold shadow-lg text-amber-600">
                        🥉
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-700 text-zinc-950 text-[8px] font-black flex items-center justify-center border border-white">
                        3
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-200 text-center block truncate w-14" title={pangkalanRankings[2].namaPangkalan}>
                      {pangkalanRankings[2].namaPangkalan.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold">{pangkalanRankings[2].kehadiranRate}%</span>
                    <div className="w-full bg-zinc-800/50 border-t border-amber-700/20 h-10 rounded-t-xl mt-2 flex items-center justify-center shadow-inner">
                      <span className="text-[10px] text-amber-700 font-bold font-mono">3rd</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
              </div>

              {/* SCROLLABLE REMAINING LIST (Ranks 4+) */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {pangkalanRankings.slice(3, 10).map((rank, index) => {
                  const trueIndex = index + 4;
                  return (
                    <div key={rank.namaPangkalan} className="flex items-center justify-between bg-zinc-950/40 hover:bg-zinc-950/85 p-2 rounded-xl border border-zinc-900 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full font-mono font-black text-[9px] text-zinc-400 bg-zinc-900 flex items-center justify-center shrink-0">
                          {trueIndex}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate text-zinc-200">{rank.namaPangkalan}</span>
                          <span className="text-[9px] text-zinc-500 block font-mono">{rank.pesertaCount} Peserta Terdaftar</span>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <span className="text-xs font-black text-emerald-400">{rank.kehadiranRate}%</span>
                        <span className="text-[9px] text-zinc-500 block">Absen</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-mono mt-3 text-center italic">
              *Diambil dari persentase kehadiran peserta di setiap kegiatan yang selesai.*
            </p>
          </div>

          {/* LIVE STREAM ACTIVITY FEED */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 h-64 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 mb-3">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                Aktivitas Absensi Langsung (Live)
              </h3>
              
              <div className="space-y-2 max-h-44 overflow-hidden">
                {latestScans.length > 0 ? (
                  latestScans.map((scan, i) => (
                    <div key={scan.id || i} className="bg-zinc-950/80 p-2 rounded-lg border-l-4 border-emerald-500 text-xs flex justify-between gap-2 animate-[fadeIn_0.3s_ease]">
                      <div className="truncate">
                        <span className="font-bold block truncate text-zinc-200">
                          {scan.namaPangkalan} ({scan.jenisKelamin === 'Putra' ? 'Pa' : 'Pi'})
                        </span>
                        <span className="text-[9px] text-zinc-500 block">
                          Telah hadir di: <b className="text-emerald-400">{scan.namaKegiatan}</b>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-amber-400">{formatIndonesianTime(scan.jam)}</span>
                        <span className="text-[8px] text-zinc-600 block uppercase">Log</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-600 text-center text-xs py-8 italic font-mono">
                    Belum ada scan masuk hari ini...
                  </p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 text-center font-mono">
              Auto refresh aktif &bull; Live data stream
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER METRIC */}
      <div className="mt-6 border-t border-zinc-900/60 pt-4 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono gap-4">
        <span>Aplikasi Monitoring Kehadiran Perkemahan Pramuka Kwartir Ranting Bulukumpa © 2026</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Database: Google Sheet (Connected)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Core Server: Google Apps Script (Active)
          </span>
        </div>
      </div>
    </div>
  );
}
