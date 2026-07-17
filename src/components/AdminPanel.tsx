/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Calendar, CheckSquare, FileBarChart2, Settings, Code2, LogOut,
  Plus, Edit2, Trash2, Search, Filter, Download, Upload, Printer, AlertTriangle,
  UserPlus, Shield, Activity, RefreshCw, Eye, Check, AlertCircle, FileText, Megaphone, Volume2, X,
  Home, School, UserCheck, ExternalLink, Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Peserta, Kegiatan, Kehadiran, Admin, AuditLog, AppSettings, Pengumuman, PangkalanDetail, DokumenKegiatan, formatIndonesianDate, formatIndonesianTime } from '../types';
import ScannerComponent from './ScannerComponent';
import GasExportPanel from './GasExportPanel';
import { speakIndonesianText } from '../lib/tts';
import { generateKartuAbsenPDF, generateLaporanPDF, generateJadwalKegiatanPDF } from '../lib/pdf';

interface AdminPanelProps {
  currentAdmin: Admin;
  peserta: Peserta[];
  kegiatan: Kegiatan[];
  kehadiran: Kehadiran[];
  admins: Admin[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  announcements: Pengumuman[];
  documents: DokumenKegiatan[];
  pangkalanDetails: PangkalanDetail[];
  onUpdatePangkalanDetails: React.Dispatch<React.SetStateAction<PangkalanDetail[]>>;
  isOffline: boolean;
  onToggleOffline: () => void;
  // State setters passed from App.tsx to ensure persistence
  onUpdatePeserta: (p: Peserta[]) => void;
  onUpdateKegiatan: (k: Kegiatan[]) => void;
  onUpdateKehadiran: (h: Kehadiran[]) => void;
  onUpdateAdmins: (a: Admin[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
  onUpdateAnnouncements: (a: Pengumuman[]) => void;
  onUpdateDocuments: (d: DokumenKegiatan[]) => void;
  onAddAuditLog: (aktivitas: string, detail: string) => void;
  onLogout: () => void;
  onPullData?: (silent?: boolean) => Promise<boolean>;
}

type AdminTab = 'dashboard' | 'peserta' | 'kegiatan' | 'absensi' | 'laporan' | 'pengumuman' | 'dokumen' | 'pengaturan' | 'gas';

export default function AdminPanel({
  currentAdmin,
  peserta,
  kegiatan,
  kehadiran,
  admins,
  auditLogs,
  settings,
  announcements,
  documents,
  pangkalanDetails,
  onUpdatePangkalanDetails,
  isOffline,
  onToggleOffline,
  onUpdatePeserta,
  onUpdateKegiatan,
  onUpdateKehadiran,
  onUpdateAdmins,
  onUpdateSettings,
  onUpdateAnnouncements,
  onUpdateDocuments,
  onAddAuditLog,
  onLogout,
  onPullData
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

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

  // --- ANNOUNCEMENT MANAGEMENT STATES & HANDLERS ---
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementTargetFilter, setAnnouncementTargetFilter] = useState<'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)' | 'Semua_Filter'>('Semua_Filter');
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Pengumuman | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    judul: '',
    konten: '',
    tingkatanTarget: 'Semua' as 'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)',
    statusAktif: true
  });
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  // --- DOKUMEN KEGIATAN STATES & HANDLERS ---
  const [docSearch, setDocSearch] = useState('');
  const [docTingkatanFilter, setDocTingkatanFilter] = useState<'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)' | 'Semua_Filter'>('Semua_Filter');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DokumenKegiatan | null>(null);
  const [docForm, setDocForm] = useState({
    judul: '',
    linkDrive: '',
    tingkatan: 'Semua' as 'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)'
  });

  const handleStartEditDoc = (doc: DokumenKegiatan) => {
    setEditingDoc(doc);
    setDocForm({
      judul: doc.judul,
      linkDrive: doc.linkDrive,
      tingkatan: doc.tingkatan
    });
    setShowAddDocModal(true);
  };

  const handleDeleteDoc = (id: string, judul: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus dokumen "${judul}"?`)) {
      const updated = documents.filter(d => d.id !== id);
      onUpdateDocuments(updated);
      onAddAuditLog("Hapus Dokumen", `Menghapus dokumen kegiatan: "${judul}"`);
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.judul.trim() || !docForm.linkDrive.trim()) {
      alert("Judul dan Link Drive tidak boleh kosong!");
      return;
    }

    if (editingDoc) {
      // Editing mode
      const updated = documents.map(d => {
        if (d.id === editingDoc.id) {
          return {
            ...d,
            judul: docForm.judul.trim(),
            linkDrive: docForm.linkDrive.trim(),
            tingkatan: docForm.tingkatan
          };
        }
        return d;
      });
      onUpdateDocuments(updated);
      onAddAuditLog("Ubah Dokumen", `Mengubah dokumen kegiatan "${editingDoc.judul}" menjadi "${docForm.judul.trim()}"`);
    } else {
      // Creation mode
      const maxDocNum = documents.reduce((max, d) => {
        const num = parseInt(d.id.replace('DOC', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newDoc: DokumenKegiatan = {
        id: `DOC${String(maxDocNum + 1).padStart(3, '0')}`,
        judul: docForm.judul.trim(),
        linkDrive: docForm.linkDrive.trim(),
        tingkatan: docForm.tingkatan,
        tanggalUpload: new Date().toISOString().split('T')[0]
      };
      onUpdateDocuments([...documents, newDoc]);
      onAddAuditLog("Tambah Dokumen", `Menambahkan dokumen baru: "${newDoc.judul}" untuk tingkatan ${newDoc.tingkatan}`);
    }

    // Reset Form
    setDocForm({
      judul: '',
      linkDrive: '',
      tingkatan: 'Semua'
    });
    setEditingDoc(null);
    setShowAddDocModal(false);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = d.judul.toLowerCase().includes(docSearch.toLowerCase().trim());
      const matchesFilter = docTingkatanFilter === 'Semua_Filter' || d.tingkatan === docTingkatanFilter;
      return matchesSearch && matchesFilter;
    });
  }, [documents, docSearch, docTingkatanFilter]);
  
  // Audio Speech Voice selection states
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(0.9); // Default 0.9 is better for loudspeaker echo
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);

  // Load available speech voices
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        // Filter to only Indonesian/Malay/Bahasa voices
        const idVoices = availableVoices.filter(v => {
          const lang = v.lang.toLowerCase().replace('_', '-');
          const name = v.name.toLowerCase();
          return (
            lang === 'id' ||
            lang.startsWith('id-') ||
            lang === 'ind' ||
            lang.startsWith('ind-') ||
            lang === 'in-id' ||
            lang.startsWith('in-id') ||
            name.includes('indonesian') ||
            name.includes('bahasa')
          );
        });
        setVoices(idVoices);
        
        // Find best female Indonesian voice as pre-selected
        const femaleKeywords = ['gadis', 'damayanti', 'google', 'female', 'perempuan', 'wanita', 'siri', 'yasmin', 'mellina'];
        const bestFemale = idVoices.find(v => {
          const name = v.name.toLowerCase();
          return femaleKeywords.some(kw => name.includes(kw)) && !name.includes('ardi');
        });

        if (bestFemale) {
          setSelectedVoiceName(bestFemale.name);
        } else if (idVoices.length > 0) {
          setSelectedVoiceName(idVoices[0].name);
        }
      };
      
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSpeakAnnouncement = (ann: Pengumuman) => {
    if (isSpeakingId === ann.id) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingId(null);
      return;
    }

    const fullText = ann.konten;
    speakIndonesianText(fullText, {
      rate: speechRate,
      pitch: speechPitch,
      voiceName: selectedVoiceName,
      onStart: () => setIsSpeakingId(ann.id),
      onEnd: () => setIsSpeakingId(null),
      onError: () => setIsSpeakingId(null)
    });
    onAddAuditLog("Putar Suara Pengumuman", `Memutar suara Text-to-Speech pengumuman: "${ann.judul}".`);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    if (editingAnnouncement) {
      const updated = announcements.map(ann => {
        if (ann.id === editingAnnouncement.id) {
          return {
            ...ann,
            judul: announcementForm.judul,
            konten: announcementForm.konten,
            tingkatanTarget: announcementForm.tingkatanTarget,
            statusAktif: announcementForm.statusAktif
          };
        }
        return ann;
      });
      onUpdateAnnouncements(updated);
      onAddAuditLog("Ubah Pengumuman", `Mengubah pengumuman: "${announcementForm.judul}"`);
      setEditingAnnouncement(null);
    } else {
      const maxAnnNum = announcements.reduce((max, a) => {
        const num = parseInt(a.id.replace('ANN', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newAnn: Pengumuman = {
        id: `ANN${String(maxAnnNum + 1).padStart(3, '0')}`,
        judul: announcementForm.judul,
        konten: announcementForm.konten,
        tanggal: dateStr,
        jam: timeStr,
        tingkatanTarget: announcementForm.tingkatanTarget,
        statusAktif: announcementForm.statusAktif,
        dibuatOleh: currentAdmin.nama
      };
      onUpdateAnnouncements([newAnn, ...announcements]);
      onAddAuditLog("Tambah Pengumuman", `Membuat pengumuman baru: "${newAnn.judul}"`);
    }

    setAnnouncementForm({
      judul: '',
      konten: '',
      tingkatanTarget: 'Semua',
      statusAktif: true
    });
    setShowAddAnnouncementModal(false);
  };

  const handleToggleAnnouncementStatus = (id: string) => {
    const updated = announcements.map(ann => {
      if (ann.id === id) {
        const nextStatus = !ann.statusAktif;
        onAddAuditLog("Ubah Status Pengumuman", `Mengubah status pengumuman "${ann.judul}" menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}.`);
        return { ...ann, statusAktif: nextStatus };
      }
      return ann;
    });
    onUpdateAnnouncements(updated);
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pengumuman "${title}"?`)) {
      const filtered = announcements.filter(ann => ann.id !== id);
      onUpdateAnnouncements(filtered);
      onAddAuditLog("Hapus Pengumuman", `Menghapus pengumuman: "${title}"`);
      if (isSpeakingId === id) {
        window.speechSynthesis.cancel();
        setIsSpeakingId(null);
      }
    }
  };

  const handleStartEditAnnouncement = (ann: Pengumuman) => {
    setEditingAnnouncement(ann);
    setAnnouncementForm({
      judul: ann.judul,
      konten: ann.konten,
      tingkatanTarget: ann.tingkatanTarget,
      statusAktif: ann.statusAktif
    });
    setShowAddAnnouncementModal(true);
  };

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      const matchesSearch = ann.judul.toLowerCase().includes(announcementSearch.toLowerCase()) || 
                            ann.konten.toLowerCase().includes(announcementSearch.toLowerCase());
      const matchesTarget = announcementTargetFilter === 'Semua_Filter' || ann.tingkatanTarget === announcementTargetFilter;
      return matchesSearch && matchesTarget;
    });
  }, [announcements, announcementSearch, announcementTargetFilter]);

  // Interactive clocks & alerts
  const [serverTimeStr, setServerTimeStr] = useState<string>('');
  React.useEffect(() => {
    const timer = setInterval(() => {
      setServerTimeStr(new Date().toLocaleTimeString('id-ID') + ' WITA');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- TAB STATS CALCULATOR ---
  const kpis = useMemo(() => {
    // Unique Pangkalans
    const boysPangkalans = new Set(peserta.filter(p => p.jenisKelamin === 'Putra').map(p => p.namaPangkalan)).size;
    const girlsPangkalans = new Set(peserta.filter(p => p.jenisKelamin === 'Putri').map(p => p.namaPangkalan)).size;
    const totalPesertaCount = peserta.length;
    const totalKegiatanCount = kegiatan.length;

    // Jumlah Pangkalan (Unique names)
    const totalPangkalans = new Set(peserta.map(p => p.namaPangkalan)).size;

    // Jumlah Sekolah yang Hadir (Unique namaPangkalan that have logged presence)
    const sekolahHadir = new Set(kehadiran.map(h => h.namaPangkalan)).size;

    // Jumlah Pembina
    const totalPembina = new Set(pangkalanDetails.map(pd => pd.namaPembina?.trim()).filter(Boolean)).size;

    const todayStr = new Date().toISOString().split('T')[0];
    const loggedToday = kehadiran.filter(h => h.tanggal === todayStr).length;

    // Attendance rate
    const finishedKegiatans = kegiatan.filter(k => k.status === 'Selesai');
    const totalPossibleLogs = totalPesertaCount * finishedKegiatans.length;
    const actualLogs = kehadiran.filter(h => finishedKegiatans.some(f => f.idKegiatan === h.idKegiatan)).length;
    const generalProgress = totalPossibleLogs > 0 ? Math.round((actualLogs / totalPossibleLogs) * 100) : 0;

    return {
      boysPangkalans,
      girlsPangkalans,
      totalPesertaCount,
      totalKegiatanCount,
      loggedToday,
      generalProgress,
      totalPangkalans,
      sekolahHadir,
      totalPembina
    };
  }, [peserta, kegiatan, kehadiran, pangkalanDetails]);

  // Next Event
  const nextEvent = useMemo(() => {
    return kegiatan
      .filter(k => k.status === 'Aktif')
      .sort((a, b) => a.urutan - b.urutan)[0];
  }, [kegiatan]);

  // Recharts Chart Data (Attendance log per event)
  const chartData = useMemo(() => {
    return kegiatan.map(k => {
      const logs = kehadiran.filter(h => h.idKegiatan === k.idKegiatan);
      return {
        name: k.namaKegiatan.length > 15 ? k.namaKegiatan.substring(0, 15) + '...' : k.namaKegiatan,
        "Jumlah Hadir": logs.length,
        "Target": peserta.length
      };
    });
  }, [kegiatan, kehadiran, peserta]);

  // Top 3 Most Active Participants by Level
  const topParticipantsByLevel = useMemo(() => {
    const levels = [
      'Penggalang SD (SD/MI)',
      'Penggalang SMP (SMP/MTs)',
      'Penegak (SMA/MA/SMK)'
    ];

    return levels.map(level => {
      // Only include active participants
      const levelPeserta = peserta.filter(p => p.tingkatan === level && p.statusAktif !== false);

      const rated = levelPeserta.map(p => {
        const pKehadiran = kehadiran.filter(h => h.idPeserta === p.idPeserta && h.statusHadir === 'Hadir');
        const count = pKehadiran.length;

        // Sum of check-in times in seconds since midnight for tie-breaking
        const sumSeconds = pKehadiran.reduce((sum, h) => {
          try {
            const parts = h.jam.split(':');
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            const seconds = parseInt(parts[2], 10) || 0;
            return sum + (hours * 3600) + (minutes * 60) + seconds;
          } catch (e) {
            return sum;
          }
        }, 0);

        return {
          peserta: p,
          count,
          sumSeconds
        };
      });

      // Sort by: 1. Count descending, 2. Sum of seconds ascending (earlier check-in)
      rated.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.sumSeconds - b.sumSeconds;
      });

      return {
        level,
        top3: rated.slice(0, 3)
      };
    });
  }, [peserta, kehadiran]);


  // --- PESERTA TAB STATE ---
  const [searchPeserta, setSearchPeserta] = useState('');
  const [filterJk, setFilterJk] = useState<'Semua' | 'Putra' | 'Putri'>('Semua');
  const [filterTingkatan, setFilterTingkatan] = useState<'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)'>('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [selectedPesertaForQr, setSelectedPesertaForQr] = useState<Peserta | null>(null);
  const [viewingPangkalan, setViewingPangkalan] = useState<Peserta | null>(null);
  const [isPesertaModalOpen, setIsPesertaModalOpen] = useState(false);
  const [pesertaForm, setPesertaForm] = useState<Partial<Peserta>>({
    idPeserta: '',
    namaPangkalan: '',
    jenisKelamin: 'Putra',
    statusAktif: true,
    tingkatan: 'Penggalang SD (SD/MI)'
  });
  const [pesertaFormMode, setPesertaFormMode] = useState<'tambah' | 'edit'>('tambah');
  const [csvText, setCsvText] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filteredPeserta = useMemo(() => {
    return peserta.filter(p => {
      const actualTingkatan = p.tingkatan || 'Penggalang SD (SD/MI)';
      const actualJk = p.jenisKelamin || 'Putra';
      
      const textQuery = searchPeserta.toLowerCase();
      const matchesSearch = p.idPeserta.toLowerCase().includes(textQuery) ||
                            p.namaPangkalan.toLowerCase().includes(textQuery) ||
                            actualTingkatan.toLowerCase().includes(textQuery) ||
                            (actualJk === 'Putra' ? 'putra' : 'putri').includes(textQuery) ||
                            (actualJk === 'Putra' ? 'pa' : 'pi').includes(textQuery);
                            
      const matchesJk = filterJk === 'Semua' || actualJk === filterJk;
      const matchesTingkatan = filterTingkatan === 'Semua' || actualTingkatan === filterTingkatan;
      const matchesStatus = filterStatus === 'Semua' || 
                            (filterStatus === 'Aktif' && p.statusAktif) || 
                            (filterStatus === 'Nonaktif' && !p.statusAktif);
                            
      return matchesSearch && matchesJk && matchesTingkatan && matchesStatus;
    });
  }, [peserta, searchPeserta, filterJk, filterTingkatan, filterStatus]);

  // --- CRUD PESERTA ---
  const handleOpenPesertaModal = (mode: 'tambah' | 'edit', data?: Peserta) => {
    setPesertaFormMode(mode);
    if (mode === 'edit' && data) {
      setPesertaForm(data);
    } else {
      // Auto-generate ID based on count
      const maxPesertaNum = peserta.reduce((max, p) => {
        const num = parseInt(p.idPeserta.replace('PBK', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newId = `PBK${String(maxPesertaNum + 1).padStart(3, '0')}`;
      setPesertaForm({
        idPeserta: newId,
        namaPangkalan: '',
        jenisKelamin: 'Putra',
        statusAktif: true,
        tingkatan: 'Penggalang SD (SD/MI)'
      });
    }
    setIsPesertaModalOpen(true);
  };

  const handleSavePeserta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesertaForm.idPeserta || !pesertaForm.namaPangkalan) return;

    if (pesertaFormMode === 'tambah') {
      // Check duplicate
      if (peserta.some(p => p.idPeserta === pesertaForm.idPeserta)) {
        alert("ID Peserta sudah ada!");
        return;
      }
      const newPeserta: Peserta = {
        idPeserta: pesertaForm.idPeserta,
        namaPangkalan: pesertaForm.namaPangkalan,
        jenisKelamin: pesertaForm.jenisKelamin as 'Putra' | 'Putri',
        kodeQr: pesertaForm.idPeserta,
        tanggalDaftar: new Date().toISOString().split('T')[0],
        statusAktif: !!pesertaForm.statusAktif,
        tingkatan: pesertaForm.tingkatan || 'Penggalang SD (SD/MI)'
      };
      onUpdatePeserta([...peserta, newPeserta]);
      onAddAuditLog("Tambah Peserta", `Menambahkan peserta baru ${newPeserta.idPeserta} - ${newPeserta.namaPangkalan}`);
    } else {
      const updated = peserta.map(p => p.idPeserta === pesertaForm.idPeserta ? { ...p, ...pesertaForm } as Peserta : p);
      onUpdatePeserta(updated);
      onAddAuditLog("Edit Peserta", `Mengubah biodata peserta ${pesertaForm.idPeserta}`);
    }
    setIsPesertaModalOpen(false);
  };

  const handleDeletePeserta = (id: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus peserta dengan ID ${id}?`)) {
      const updated = peserta.filter(p => p.idPeserta !== id);
      onUpdatePeserta(updated);
      onAddAuditLog("Hapus Peserta", `Menghapus peserta dengan ID ${id}`);
    }
  };

  // Participant Import / Export CSV simulation
  const exportPesertaToCsv = () => {
    let csv = "ID Peserta,Nama Pangkalan,Jenis Kelamin,Tanggal Daftar,Status Aktif\n";
    peserta.forEach(p => {
      csv += `"${p.idPeserta}","${p.namaPangkalan.replace(/"/g, '""')}","${p.jenisKelamin}","${p.tanggalDaftar}","${p.statusAktif}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Peserta_Pramuka_Bulukumpa.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split("\n");
      const newParticipants: Peserta[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV splitter
        const cols = line.split(",").map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 3) continue;

        const maxPesertaNumInImport = Math.max(
          peserta.reduce((max, p) => {
            const num = parseInt(p.idPeserta.replace('PBK', ''), 10);
            return !isNaN(num) && num > max ? num : max;
          }, 0),
          newParticipants.reduce((max, p) => {
            const num = parseInt(p.idPeserta.replace('PBK', ''), 10);
            return !isNaN(num) && num > max ? num : max;
          }, 0)
        );
        const id = cols[0] || `PBK${String(maxPesertaNumInImport + 1).padStart(3, '0')}`;
        const pangkalan = cols[1];
        const jk = cols[2] === 'Putri' ? 'Putri' : 'Putra';
        const dateStr = cols[3] || new Date().toISOString().split('T')[0];
        
        newParticipants.push({
          idPeserta: id,
          namaPangkalan: pangkalan,
          jenisKelamin: jk,
          kodeQr: id,
          tanggalDaftar: dateStr,
          statusAktif: true
        });
      }

      if (newParticipants.length > 0) {
        onUpdatePeserta([...peserta, ...newParticipants]);
        onAddAuditLog("Import CSV Peserta", `Berhasil mengimpor ${newParticipants.length} peserta baru`);
        alert(`Berhasil mengimpor ${newParticipants.length} peserta.`);
        setIsImportOpen(false);
        setCsvText('');
      } else {
        alert("Tidak ada baris data valid ditemukan untuk diimpor.");
      }
    } catch (e) {
      alert("Format CSV tidak valid. Gunakan format: ID,Pangkalan,Jenis Kelamin");
    }
  };


  // --- KEGIATAN TAB STATE ---
  const [filterKegiatanTingkatan, setFilterKegiatanTingkatan] = useState<'Semua' | 'Penggalang SD (SD/MI)' | 'Penggalang SMP (SMP/MTs)' | 'Penegak (SMA/MA/SMK)'>('Semua');
  
  const filteredKegiatan = useMemo(() => {
    const sorted = [...kegiatan].sort((a, b) => a.urutan - b.urutan);
    return sorted.filter(k => {
      if (filterKegiatanTingkatan === 'Semua') return true;
      return !k.tingkatan || k.tingkatan.length === 0 || k.tingkatan.includes(filterKegiatanTingkatan);
    });
  }, [kegiatan, filterKegiatanTingkatan]);

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

  const getIndonesianDayName = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  };

  const [isKegiatanModalOpen, setIsKegiatanModalOpen] = useState(false);
  const [kegiatanForm, setKegiatanForm] = useState<Partial<Kegiatan>>({
    idKegiatan: '',
    namaKegiatan: '',
    hari: 'Sabtu',
    tanggal: '',
    jamMulai: '',
    jamSelesai: '',
    lokasi: '',
    status: 'Aktif',
    urutan: 1
  });
  const [kegiatanFormMode, setKegiatanFormMode] = useState<'tambah' | 'edit'>('tambah');

  const startVal = parseToHHMM(kegiatanForm.jamMulai || "08:00");
  const [startH, startM] = startVal.split(':');
  const endVal = parseToHHMM(kegiatanForm.jamSelesai || "10:00");
  const [endH, endM] = endVal.split(':');
  const hoursArray = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesArray = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // --- CRUD KEGIATAN ---
  const handleOpenKegiatanModal = (mode: 'tambah' | 'edit', data?: Kegiatan) => {
    setKegiatanFormMode(mode);
    if (mode === 'edit' && data) {
      setKegiatanForm({
        ...data,
        jamMulai: parseToHHMM(data.jamMulai),
        jamSelesai: parseToHHMM(data.jamSelesai)
      });
    } else {
      const maxKgtNum = kegiatan.reduce((max, k) => {
        const num = parseInt(k.idKegiatan.replace('KGT', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newId = `KGT${String(maxKgtNum + 1).padStart(3, '0')}`;
      setKegiatanForm({
        idKegiatan: newId,
        namaKegiatan: '',
        hari: 'Sabtu',
        tanggal: new Date().toISOString().split('T')[0],
        jamMulai: '08:00',
        jamSelesai: '10:00',
        lokasi: '',
        status: 'Aktif',
        urutan: maxKgtNum + 1
      });
    }
    setIsKegiatanModalOpen(true);
  };

  const handleSaveKegiatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kegiatanForm.idKegiatan || !kegiatanForm.namaKegiatan) return;

    if (kegiatanFormMode === 'tambah') {
      if (kegiatan.some(k => k.idKegiatan === kegiatanForm.idKegiatan)) {
        alert("ID Kegiatan sudah terdaftar!");
        return;
      }
      const newKeg: Kegiatan = {
        idKegiatan: kegiatanForm.idKegiatan,
        namaKegiatan: kegiatanForm.namaKegiatan,
        hari: kegiatanForm.hari || 'Sabtu',
        tanggal: kegiatanForm.tanggal || '',
        jamMulai: kegiatanForm.jamMulai || '',
        jamSelesai: kegiatanForm.jamSelesai || '',
        lokasi: kegiatanForm.lokasi || '',
        status: kegiatanForm.status as 'Aktif' | 'Selesai',
        urutan: Number(kegiatanForm.urutan) || (kegiatan.reduce((max, k) => {
          const num = parseInt(k.idKegiatan.replace('KGT', ''), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0) + 1)
      };
      onUpdateKegiatan([...kegiatan, newKeg]);
      onAddAuditLog("Tambah Kegiatan", `Menambahkan jadwal kegiatan baru: ${newKeg.namaKegiatan}`);
    } else {
      const updated = kegiatan.map(k => k.idKegiatan === kegiatanForm.idKegiatan ? { ...k, ...kegiatanForm } as Kegiatan : k);
      onUpdateKegiatan(updated);
      onAddAuditLog("Edit Kegiatan", `Mengubah jadwal kegiatan ${kegiatanForm.idKegiatan}`);
    }
    setIsKegiatanModalOpen(false);
  };

  const handleDeleteKegiatan = (id: string) => {
    if (confirm(`Yakin ingin menghapus jadwal kegiatan ${id}?`)) {
      const updated = kegiatan.filter(k => k.idKegiatan !== id);
      onUpdateKegiatan(updated);
      onAddAuditLog("Hapus Kegiatan", `Menghapus jadwal kegiatan ${id}`);
    }
  };


  // --- ABSENSI SCANNER STATE ---
  const [activeKegiatanId, setActiveKegiatanId] = useState<string>('');
  
  const selectedKegiatan = useMemo(() => {
    return kegiatan.find(k => k.idKegiatan === activeKegiatanId) || null;
  }, [kegiatan, activeKegiatanId]);

  // Handle scanned QR Code
  const handleProcessScan = (code: string): { status: 'success' | 'warn' | 'error'; message: string; subtext?: string } => {
    if (!selectedKegiatan) {
      return { status: 'error', message: "Kegiatan belum dipilih!" };
    }

    const trimmed = code.trim().toUpperCase();
    const targetPeserta = peserta.find(p => p.idPeserta === trimmed || p.kodeQr === trimmed);
    
    if (!targetPeserta) {
      return { status: 'error', message: "ID QR Tidak Dikenal", subtext: "Peserta tidak terdaftar di database." };
    }

    // Check duplicate check-in
    const isAlreadyCheckedIn = kehadiran.some(h => h.idPeserta === targetPeserta.idPeserta && h.idKegiatan === selectedKegiatan.idKegiatan);
    if (isAlreadyCheckedIn) {
      return { 
        status: 'warn', 
        message: "Sudah melakukan absensi.", 
        subtext: `${targetPeserta.namaPangkalan} (${targetPeserta.jenisKelamin === 'Putra' ? 'Putra' : 'Putri'})` 
      };
    }

    // Insert Log
    const now = new Date();
    const maxLogNum = kehadiran.reduce((max, h) => {
      const num = parseInt(h.id.replace('LOG', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const newLog: Kehadiran = {
      id: `LOG${String(maxLogNum + 1).padStart(5, '0')}`,
      tanggal: now.toISOString().split('T')[0],
      jam: now.toTimeString().split(' ')[0].substring(0, 5),
      idPeserta: targetPeserta.idPeserta,
      namaPangkalan: targetPeserta.namaPangkalan,
      jenisKelamin: targetPeserta.jenisKelamin,
      idKegiatan: selectedKegiatan.idKegiatan,
      namaKegiatan: selectedKegiatan.namaKegiatan,
      statusHadir: 'Hadir',
      petugas: currentAdmin.nama
    };

    onUpdateKehadiran([...kehadiran, newLog]);
    onAddAuditLog("Melakukan Absensi", `Petugas ${currentAdmin.nama} merekam kehadiran ${targetPeserta.idPeserta} di kegiatan ${selectedKegiatan.namaKegiatan}`);

    return {
      status: 'success',
      message: "BERHASIL HADIR",
      subtext: `${targetPeserta.namaPangkalan} - ${targetPeserta.jenisKelamin === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)'}`
    };
  };


  // --- LAPORAN TAB STATE ---
  const [repKegiatanId, setRepKegiatanId] = useState('Semua');
  const [repPangkalan, setRepPangkalan] = useState('Semua');
  const [repJk, setRepJk] = useState('Semua');

  const repPangkalanOptions = useMemo(() => {
    return Array.from(new Set(peserta.map(p => p.namaPangkalan)));
  }, [peserta]);

  const filteredKehadiranReport = useMemo(() => {
    return kehadiran.filter(h => {
      const matchesKegiatan = repKegiatanId === 'Semua' || h.idKegiatan === repKegiatanId;
      const matchesPangkalan = repPangkalan === 'Semua' || h.namaPangkalan === repPangkalan;
      const matchesJk = repJk === 'Semua' || h.jenisKelamin === repJk;
      return matchesKegiatan && matchesPangkalan && matchesJk;
    });
  }, [kehadiran, repKegiatanId, repPangkalan, repJk]);

  // Export report CSV
  const exportReportToCsv = () => {
    let csv = "Tanggal,Jam,ID Peserta,Nama Pangkalan,Jenis Kelamin,ID Kegiatan,Nama Kegiatan,Status Hadir,Petugas\n";
    filteredKehadiranReport.forEach(h => {
      csv += `"${h.tanggal}","${h.jam}","${h.idPeserta}","${h.namaPangkalan.replace(/"/g, '""')}","${h.jenisKelamin}","${h.idKegiatan}","${h.namaKegiatan.replace(/"/g, '""')}","${h.statusHadir}","${h.petugas}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Absensi_Kwartir_Bulukumpa.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // State for direct window-based high-fidelity printing (avoiding iframe restrictions)
  const [printTarget, setPrintTarget] = useState<{
    type: 'kartu' | 'laporan';
    data: any;
  } | null>(null);

  React.useEffect(() => {
    if (printTarget) {
      const timer = setTimeout(() => {
        window.print();
        setPrintTarget(null);
      }, 500); // 500ms allows the browser to render the QR image and set page dimensions properly
      return () => clearTimeout(timer);
    }
  }, [printTarget]);

  const handlePrintKartuAbsen = async (p: Peserta | null) => {
    if (!p) return;
    try {
      await generateKartuAbsenPDF(p, settings);
      onAddAuditLog("Unduh Kartu Absen", `Berhasil mengunduh PDF kartu absen pangkalan: "${p.namaPangkalan}" (${p.idPeserta}).`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF kartu absen.");
    }
  };

  const handlePrintLaporan = async () => {
    try {
      await generateLaporanPDF(filteredKehadiranReport, {
        kegiatan: repKegiatanId === 'Semua' ? 'Semua Kegiatan' : repKegiatanId,
        pangkalan: repPangkalan === 'Semua' ? 'Semua Pangkalan' : repPangkalan,
        kategori: repJk === 'Semua' ? 'Semua Kategori' : (repJk === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)')
      }, settings);
      onAddAuditLog("Unduh Laporan Kehadiran", `Berhasil mengunduh PDF laporan kehadiran.`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF Laporan Kehadiran.");
    }
  };


  // --- PENGATURAN STATE ---
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<Partial<Admin>>({
    username: '',
    password: '',
    nama: '',
    level: 'Panitia'
  });

  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editAdminForm, setEditAdminForm] = useState<Partial<Admin>>({
    username: '',
    password: '',
    nama: '',
    level: 'Panitia'
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.password || !adminForm.nama) return;

    if (admins.some(a => a.username === adminForm.username.toLowerCase())) {
      alert("Username admin sudah terdaftar!");
      return;
    }

    const newAdm: Admin = {
      username: adminForm.username.toLowerCase(),
      password: adminForm.password,
      nama: adminForm.nama,
      level: adminForm.level as 'Super Admin' | 'Panitia'
    };

    onUpdateAdmins([...admins, newAdm]);
    onAddAuditLog("Tambah Admin", `Menambahkan admin baru: ${newAdm.username} dengan level ${newAdm.level}`);
    setIsAddAdminOpen(false);
    setAdminForm({ username: '', password: '', nama: '', level: 'Panitia' });
  };

  const handleStartEditAdmin = (adm: Admin) => {
    setEditingAdmin(adm);
    setEditAdminForm({
      username: adm.username,
      password: adm.password,
      nama: adm.nama,
      level: adm.level
    });
  };

  const handleSaveEditAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdminForm.username || !editAdminForm.password || !editAdminForm.nama) return;

    const newUsername = editAdminForm.username.toLowerCase();
    if (newUsername !== editingAdmin?.username) {
      if (admins.some(a => a.username === newUsername)) {
        alert("Username admin sudah terdaftar!");
        return;
      }
    }

    const updatedAdmins = admins.map(a => {
      if (a.username === editingAdmin?.username) {
        return {
          ...a,
          username: newUsername,
          password: editAdminForm.password!,
          nama: editAdminForm.nama!,
          level: editAdminForm.level as 'Super Admin' | 'Panitia'
        };
      }
      return a;
    });

    onUpdateAdmins(updatedAdmins);
    onAddAuditLog("Edit Admin", `Mengubah akun admin: ${editingAdmin?.username}`);
    setEditingAdmin(null);
    setEditAdminForm({ username: '', password: '', nama: '', level: 'Panitia' });
  };

  const handleDeleteAdmin = (usernameToDelete: string) => {
    if (usernameToDelete === currentAdmin.username) {
      alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun admin: "${usernameToDelete}"?`)) {
      const updatedAdmins = admins.filter(a => a.username !== usernameToDelete);
      onUpdateAdmins(updatedAdmins);
      onAddAuditLog("Hapus Admin", `Menghapus akun admin: ${usernameToDelete}`);
    }
  };

  // State JSON Backup & Restore
  const handleBackupDatabase = () => {
    const backupState = {
      peserta,
      kegiatan,
      kehadiran,
      admins,
      settings,
      auditLogs
    };

    const str = JSON.stringify(backupState, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_Pramuka_Bulukumpa_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    onAddAuditLog("Backup Data", "Melakukan ekspor backup lengkap database pramuka.");
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.peserta && parsed.kegiatan && parsed.kehadiran) {
            onUpdatePeserta(parsed.peserta);
            onUpdateKegiatan(parsed.kegiatan);
            onUpdateKehadiran(parsed.kehadiran);
            if (parsed.admins) onUpdateAdmins(parsed.admins);
            if (parsed.settings) onUpdateSettings(parsed.settings);
            onAddAuditLog("Restore Data", "Berhasil melakukan pemulihan (restore) database lengkap dari file backup JSON.");
            alert("Database Pramuka Berhasil Di-Restore!");
          } else {
            alert("Format database tidak valid!");
          }
        } catch (err) {
          alert("Gagal membaca file JSON.");
        }
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="monitoring-admin-dashboard">
      {/* SIDEBAR NAVIGATION */}
      <div className="lg:col-span-3 bg-emerald-800 dark:bg-emerald-950 border border-emerald-700/30 text-white rounded-2xl p-5 shadow-xl flex flex-col justify-between h-fit lg:sticky lg:top-6">
        <div className="space-y-6">
          {/* PROFILE CARD */}
          <div className="flex items-center gap-3 p-2 border-b border-emerald-700/40 pb-4">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-emerald-900 flex items-center justify-center font-black text-sm">
              🔑
            </div>
            <div className="truncate">
              <h4 className="text-[10px] font-bold font-mono text-emerald-300 uppercase tracking-widest">{currentAdmin.level}</h4>
              <p className="text-sm font-black text-white truncate">{currentAdmin.nama}</p>
            </div>
          </div>

          {/* MENUS LIST */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              Dashboard Admin
            </button>
            {currentAdmin.level === 'Super Admin' && (
              <button
                onClick={() => setActiveTab('peserta')}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'peserta' 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Data Peserta ({peserta.length})
              </button>
            )}
            {currentAdmin.level === 'Super Admin' && (
              <button
                onClick={() => setActiveTab('kegiatan')}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'kegiatan' 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Data Kegiatan ({kegiatan.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('absensi')}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'absensi' 
                  ? 'bg-emerald-500 text-white shadow-md font-extrabold' 
                  : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 animate-pulse" />
              Absensi QR Code
            </button>
            <button
              onClick={() => setActiveTab('laporan')}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'laporan' 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              <FileBarChart2 className="w-4 h-4" />
              Laporan Kehadiran
            </button>
            <button
              onClick={() => setActiveTab('pengumuman')}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'pengumuman' 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Atur Pengumuman ({announcements.length})
            </button>
            {currentAdmin.level === 'Super Admin' && (
              <button
                onClick={() => setActiveTab('dokumen')}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'dokumen' 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Dokumen Kegiatan ({documents.length})
              </button>
            )}
            {currentAdmin.level === 'Super Admin' && (
              <button
                onClick={() => setActiveTab('pengaturan')}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'pengaturan' 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-emerald-300 hover:bg-emerald-700 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                Pengaturan & Log
              </button>
            )}
            {currentAdmin.level === 'Super Admin' && (
              <button
                onClick={() => setActiveTab('gas')}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'gas' 
                    ? 'bg-amber-400 text-emerald-950 shadow-md' 
                    : 'text-amber-300 hover:bg-emerald-700 hover:text-white font-bold'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Setup Google Sheets API
              </button>
            )}
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="w-full text-left py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-2 text-rose-300 hover:bg-emerald-900 mt-8 border border-emerald-700/40 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Keluar (Logout Admin)
        </button>
      </div>

      {/* CONTENT PANEL (9 COLS) */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-tab">
            {/* KPI STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Peserta</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100">{kpis.totalPesertaCount}</span>
                  <span className="text-[9px] text-zinc-500 block">({kpis.boysPangkalans} Pa / {kpis.girlsPangkalans} Pi)</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Kegiatan</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100">{kpis.totalKegiatanCount}</span>
                  <span className="text-[9px] text-zinc-500 block">Terkonfigurasi</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-400 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Scan Hari Ini</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100 text-cyan-600 dark:text-cyan-400">{kpis.loggedToday}</span>
                  <span className="text-[9px] text-zinc-500 block">Check-in logged</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400 rounded-xl">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Jumlah Pangkalan</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100 text-purple-600 dark:text-purple-400">{kpis.totalPangkalans}</span>
                  <span className="text-[9px] text-zinc-500 block">Pangkalan terdaftar</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400 rounded-xl">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Sekolah Hadir</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100 text-indigo-600 dark:text-indigo-400">{kpis.sekolahHadir}</span>
                  <span className="text-[9px] text-zinc-500 block">Melakukan check-in</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-emerald-50 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-400 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Jumlah Pembina</span>
                  <span className="text-2xl font-black font-mono text-zinc-800 dark:text-zinc-100 text-teal-600 dark:text-teal-450">{kpis.totalPembina}</span>
                  <span className="text-[9px] text-zinc-500 block">Pembina pendamping</span>
                </div>
              </div>
            </div>

            {/* CHARTS & SUBSTRIPS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* GRAPH (8 COLS) */}
              <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Grafik Kehadiran per Kegiatan</h3>
                    <p className="text-[11px] text-zinc-400">Membandingkan total target peserta dengan peserta yang berhasil dipindai.</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-black px-2 py-0.5 rounded">LIVE STATS</span>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#A1A1AA" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#A1A1AA" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="Jumlah Hadir" fill="#047857" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CLOCK & NEXT (4 COLS) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* Clock Card */}
                <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-sm border border-zinc-850 text-center flex flex-col justify-between items-center">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-400 block uppercase">JAM SERVER PANITIA</span>
                  <div className="my-3">
                    <span className="text-3xl font-black text-amber-400 block font-mono">{serverTimeStr || 'Loading...'}</span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1 block">Bulukumba, Sulawesi Selatan</span>
                  </div>
                  <span className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono uppercase tracking-wider block w-full">Offline Sync: Siap</span>
                </div>

                {/* Upcoming Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block">AGENDA AKTIF BERIKUTNYA</span>
                  {nextEvent ? (
                    <div className="mt-3">
                      <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-400 leading-tight">{nextEvent.namaKegiatan}</h4>
                      <div className="mt-3 text-[11px] text-zinc-500 space-y-1">
                        <p>Lokasi: <b>{nextEvent.lokasi}</b></p>
                        <p>Waktu: {nextEvent.hari}, {formatIndonesianTime(nextEvent.jamMulai)} WITA</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 mt-2 italic font-mono">Tidak ada kegiatan aktif...</p>
                  )}
                </div>
              </div>
            </div>

            {/* 3 BESAR PESERTA TERAKTIF PER TINGKATAN */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">🏆 3 Besar Peserta Teraktif per Tingkatan</h3>
                  <p className="text-[11px] text-zinc-400">Diurutkan berdasarkan jumlah kehadiran (Tie-breaker: Kumulatif waktu absensi tercepat).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topParticipantsByLevel.map((group, idx) => (
                  <div key={idx} className="bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                        <span>{group.level.replace('Penggalang ', '')}</span>
                      </h4>
                      
                      {group.top3.length > 0 && group.top3.some(item => item.count > 0) ? (
                        <div className="space-y-2.5">
                          {group.top3.filter(item => item.count > 0).map((item, pIdx) => {
                            const medalBadge = pIdx === 0 
                              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/20' 
                              : pIdx === 1 
                              ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-300/20' 
                              : 'bg-amber-600/20 text-amber-800 dark:text-amber-400 ring-2 ring-amber-600/10';
                            
                            return (
                              <div key={pIdx} className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-150/40 dark:border-zinc-800/60 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-800 transition-all">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${medalBadge}`}>
                                    {pIdx + 1}
                                  </span>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                      {item.peserta.namaPangkalan}
                                    </p>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mt-0.5 ${
                                      item.peserta.jenisKelamin === 'Putra' 
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450' 
                                        : 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-450'
                                    }`}>
                                      {item.peserta.jenisKelamin}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 pl-2">
                                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                    {item.count} <span className="text-[9px] font-medium text-zinc-400">Kegiatan</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs text-zinc-400 italic font-mono">Belum ada data kehadiran...</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: DATA PESERTA */}
        {activeTab === 'peserta' && currentAdmin.level === 'Super Admin' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6" id="participants-tab">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Database Peserta Perkemahan ({filteredPeserta.length})</h3>
                <p className="text-xs text-zinc-400">Daftar seluruh pangkalan/regu yang terdaftar di Kwartir Ranting Bulukumpa.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenPesertaModal('tambah')}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Tambah Peserta
                </button>
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </button>
                <button
                  onClick={exportPesertaToCsv}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* SEARCH & FILTER STRIP */}
            {(() => {
              const isFilterActive = searchPeserta !== '' || filterJk !== 'Semua' || filterTingkatan !== 'Semua' || filterStatus !== 'Semua';
              return (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                    
                    {/* Search Input */}
                    <div className="md:col-span-4 relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={searchPeserta}
                        onChange={(e) => setSearchPeserta(e.target.value)}
                        placeholder="Cari ID, Pangkalan, Kategori..."
                        className="w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-9 pr-4 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      />
                    </div>

                    {/* Filter Kategori */}
                    <div className="md:col-span-2 flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 shadow-sm">
                      <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <select
                        value={filterJk}
                        onChange={(e) => setFilterJk(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-800 border-none py-3 text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Semua" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Semua Kategori</option>
                        <option value="Putra" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Putra (Pa)</option>
                        <option value="Putri" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Putri (Pi)</option>
                      </select>
                    </div>

                    {/* Filter Tingkatan */}
                    <div className="md:col-span-3 flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 shadow-sm">
                      <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <select
                        value={filterTingkatan}
                        onChange={(e) => setFilterTingkatan(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-800 border-none py-3 text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Semua" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Semua Tingkatan</option>
                        <option value="Penggalang SD (SD/MI)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penggalang SD (SD/MI)</option>
                        <option value="Penggalang SMP (SMP/MTs)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penggalang SMP (SMP/MTs)</option>
                        <option value="Penegak (SMA/MA/SMK)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penegak (SMA/MA/SMK)</option>
                      </select>
                    </div>

                    {/* Filter Status */}
                    <div className="md:col-span-2 flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 shadow-sm">
                      <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-800 border-none py-3 text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Semua" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Semua Status</option>
                        <option value="Aktif" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Status Aktif</option>
                        <option value="Nonaktif" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Nonaktif</option>
                      </select>
                    </div>

                    {/* Reset Filter Button */}
                    <div className="md:col-span-1 flex">
                      <button
                        disabled={!isFilterActive}
                        onClick={() => {
                          setSearchPeserta('');
                          setFilterJk('Semua');
                          setFilterTingkatan('Semua');
                          setFilterStatus('Semua');
                        }}
                        className="w-full text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-100 disabled:dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 border border-zinc-200 dark:border-zinc-700 cursor-pointer disabled:cursor-not-allowed"
                        title="Reset Filter"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="sm:inline md:hidden lg:inline">Reset</span>
                      </button>
                    </div>

                  </div>

                  {/* Filter helper indicator badge */}
                  {isFilterActive && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400 px-1 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[9px] font-mono">Filter Aktif:</span>
                      {searchPeserta && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                          Kata kunci: "{searchPeserta}"
                          <button onClick={() => setSearchPeserta('')} className="hover:text-emerald-900 dark:hover:text-emerald-200 font-bold ml-0.5">×</button>
                        </span>
                      )}
                      {filterJk !== 'Semua' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                          Kategori: {filterJk}
                          <button onClick={() => setFilterJk('Semua')} className="hover:text-emerald-900 dark:hover:text-emerald-200 font-bold ml-0.5">×</button>
                        </span>
                      )}
                      {filterTingkatan !== 'Semua' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                          Tingkatan: {filterTingkatan}
                          <button onClick={() => setFilterTingkatan('Semua')} className="hover:text-emerald-900 dark:hover:text-emerald-200 font-bold ml-0.5">×</button>
                        </span>
                      )}
                      {filterStatus !== 'Semua' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                          Status: {filterStatus}
                          <button onClick={() => setFilterStatus('Semua')} className="hover:text-emerald-900 dark:hover:text-emerald-200 font-bold ml-0.5">×</button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MAIN DATA TABLE */}
            <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 text-zinc-500">
                    <th className="p-3 font-semibold font-mono">ID Peserta</th>
                    <th className="p-3 font-semibold">Nama Pangkalan / Gugus Depan</th>
                    <th className="p-3 font-semibold">Tingkatan</th>
                    <th className="p-3 font-semibold">Kategori</th>
                    <th className="p-3 font-semibold">Tanggal Daftar</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredPeserta.length > 0 ? (
                    filteredPeserta.map((p) => (
                      <tr key={p.idPeserta} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 border-l-4 ${
                        p.jenisKelamin === 'Putra' ? 'border-l-blue-500' : 'border-l-rose-500'
                      }`}>
                        <td className="p-3 font-bold font-mono text-emerald-800 dark:text-emerald-500">{p.idPeserta}</td>
                        <td className="p-3 font-semibold flex items-center gap-2">
                          <span className={`text-base ${p.jenisKelamin === 'Putra' ? 'text-blue-500' : 'text-rose-500'}`}>
                            {p.jenisKelamin === 'Putra' ? '👦' : '👧'}
                          </span>
                          <span>{p.namaPangkalan}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {p.tingkatan || 'Penggalang SD (SD/MI)'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.jenisKelamin === 'Putra' 
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' 
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                          }`}>
                            {p.jenisKelamin === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{p.tanggalDaftar}</td>
                        <td className="p-3">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${p.statusAktif ? 'bg-emerald-500' : 'bg-zinc-300'}`}></span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingPangkalan(p)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 rounded text-indigo-600 dark:text-indigo-400"
                              title="Lihat Data Pangkalan (Pembina & Anggota)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedPesertaForQr(p)}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
                              title="Tampilkan & Cetak QR"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenPesertaModal('edit', p)}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePeserta(p.idPeserta)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr key="empty-filtered-peserta">
                      <td colSpan={7} className="p-6 text-center text-zinc-400 italic">
                        Tidak ada data peserta ditemukan...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PRINT INDIVIDUAL QR MODAL POPUP */}
            {selectedPesertaForQr && (
              <>
                {/* Backdrop Overlay */}
                <div 
                  onClick={() => setSelectedPesertaForQr(null)} 
                  className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs animate-fade-in animate-duration-150" 
                />
                
                {/* Modal Container */}
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[101] bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-150 dark:border-zinc-800 shadow-2xl flex flex-col gap-5 animate-scale-up">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <Printer className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        Cetak QR Absensi Kontingen
                      </span>
                    </div>
                    <button 
                      onClick={() => setSelectedPesertaForQr(null)}
                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Content / Body */}
                  <div className="flex flex-col items-center text-center gap-4 py-2">
                    {/* QR Code Container */}
                    <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0 w-44 h-44 shadow-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${selectedPesertaForQr.idPeserta}`}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="bg-emerald-850 dark:bg-emerald-900/60 text-white dark:text-emerald-200 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider font-bold w-fit mx-auto uppercase">
                        KARTU IDENTITAS ABSENSI PRAMUKA
                      </div>
                      <h4 className="text-xl font-black text-zinc-950 dark:text-zinc-50 leading-snug uppercase">
                        {selectedPesertaForQr.namaPangkalan}
                      </h4>
                      
                      <div className="inline-flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 w-full">
                        <div className="flex justify-between gap-4">
                          <span>ID Peserta:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedPesertaForQr.idPeserta}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Kategori:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedPesertaForQr.jenisKelamin === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Tingkatan:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedPesertaForQr.tingkatan || 'Penggalang (SD/MI)'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex gap-3 justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <button
                      onClick={() => setSelectedPesertaForQr(null)}
                      className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        handlePrintKartuAbsen(selectedPesertaForQr);
                        setSelectedPesertaForQr(null);
                      }}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-800/10"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Kartu (PDF)
                    </button>
                  </div>

                </div>
              </>
            )}

            {/* VIEW DETAILS OF PANGKALAN OVERLAY MODAL */}
            {viewingPangkalan && (() => {
              const detail = pangkalanDetails ? pangkalanDetails.find(d => d.idPeserta === viewingPangkalan.idPeserta) : null;
              return (
                <>
                  <div onClick={() => setViewingPangkalan(null)} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm animate-fade-in animate-duration-150" />
                  <div className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-50 max-h-[84vh] overflow-y-auto bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-2xl flex flex-col gap-5 animate-scale-up">
                    
                    {/* Modal Header */}
                    <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 uppercase">
                          Rincian Biodata Kontingen
                        </span>
                        <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                          {viewingPangkalan.namaPangkalan}
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          ID Peserta: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{viewingPangkalan.idPeserta}</span> &bull; Kategori: {viewingPangkalan.jenisKelamin} &bull; Tingkatan: {viewingPangkalan.tingkatan || 'Penggalang SD'}
                        </p>
                      </div>
                      <button 
                        onClick={() => setViewingPangkalan(null)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    {!detail || ((!detail.namaPembina || detail.namaPembina.trim() === '') && (!detail.anggota || detail.anggota.length === 0)) ? (
                      <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <AlertCircle className="w-10 h-10 text-amber-500" />
                        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Belum Ada Data Diinput</h4>
                        <p className="text-xs text-zinc-400 max-w-sm">
                          Admin pangkalan ini belum menginput data Pembina Pendamping maupun Anggota Pramuka.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        
                        {/* Pembina Pendamping Card */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                            Pembina Pendamping
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-zinc-400 font-mono uppercase">Nama Pembina</p>
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase">
                                {detail.namaPembina || <span className="italic font-normal text-zinc-400">(Belum diisi)</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-400 font-mono uppercase">Nomor HP / WhatsApp</p>
                              {detail.hpPembina ? (
                                <a
                                  href={`https://wa.me/${detail.hpPembina.replace(/\D/g, '').replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-mono transition-colors border-b border-dashed border-emerald-500/45 pb-0.5 mt-0.5"
                                  title="Hubungi via WhatsApp"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.019-5.101-2.871-6.958C16.612 1.983 14.14 1.961 11.99 1.961c-5.437 0-9.861 4.414-9.864 9.848-.001 1.738.457 3.432 1.328 4.927l-1.012 3.7 3.79-.993zm11.566-7.585c-.302-.151-1.785-.882-2.057-.981-.273-.099-.471-.148-.669.149-.197.297-.767.98-.94 1.179-.173.197-.347.222-.649.072-.302-.151-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.276-2.158.172-.297.025-.457-.125-.607-.135-.135-.302-.354-.452-.53-.15-.177-.2-.303-.301-.504-.101-.2-.05-.378-.025-.53.025-.151.197-.478.297-.677.1-.199.15-.347.223-.497.074-.149.037-.282-.012-.382-.049-.1-.472-1.14-.646-1.564-.17-.408-.344-.353-.472-.353-.122-.002-.264-.002-.408-.002-.144 0-.378.054-.576.273-.198.22-.756.74-.756 1.805 0 1.065.774 2.093.882 2.241.109.15 1.522 2.324 3.69 3.259.516.222.919.355 1.233.456.518.165.989.141 1.361.085.415-.062 1.272-.519 1.452-1.02.18-.501.18-.931.126-1.02-.054-.09-.2-.149-.502-.3zm0 0" />
                                  </svg>
                                  {detail.hpPembina}
                                </a>
                              ) : (
                                <span className="italic font-normal text-zinc-400">(Belum diisi)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Anggota Pramuka Section */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                            Daftar Anggota Pramuka ({detail.anggota ? detail.anggota.length : 0} Orang)
                          </h4>
                          {!detail.anggota || detail.anggota.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                              Belum ada anggota yang diinput.
                            </p>
                          ) : (
                            <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-mono">
                                    <th className="p-3 font-semibold w-12 text-center">NO.</th>
                                    <th className="p-3 font-semibold w-32">ID ANGGOTA</th>
                                    <th className="p-3 font-semibold">NAMA LENGKAP</th>
                                    <th className="p-3 font-semibold">TEMPAT & TANGGAL LAHIR</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {detail.anggota.map((ang, idx) => (
                                    <tr key={ang.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                      <td className="p-3 text-center text-zinc-400 font-mono">{idx + 1}</td>
                                      <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">{ang.id}</td>
                                      <td className="p-3 font-semibold uppercase">{ang.nama}</td>
                                      <td className="p-3">
                                        {ang.tempatLahir}, {ang.tanggalLahir ? new Date(ang.tanggalLahir).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric'
                                        }) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <button
                        onClick={() => setViewingPangkalan(null)}
                        className="bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2 px-4 rounded-xl transition-all active:scale-95"
                      >
                        Tutup
                      </button>
                    </div>

                  </div>
                </>
              );
            })()}

            {/* IMPORT MODAL */}
            {isImportOpen && (
              <div style={{ backgroundColor: '#000000' }} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs font-mono uppercase text-zinc-600 dark:text-zinc-300">Tempel Data CSV Peserta</h4>
                  <button onClick={() => setIsImportOpen(false)} className="text-xs text-red-600 font-semibold">Tutup</button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Masukkan data dengan format baris: <b>ID,Nama Pangkalan,Jenis Kelamin</b>. Baris pertama (header) akan diabaikan secara otomatis.
                </p>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="ID Peserta,Nama Pangkalan,Jenis Kelamin&#10;PBK013,SMP Negeri 10 Bulukumpa,Putra&#10;PBK014,SMP Negeri 10 Bulukumpa,Putri"
                  className="w-full text-xs font-mono p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                />
                <button
                  onClick={handleImportCsv}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Proses Impor Ke Spreadsheet
                </button>
              </div>
            )}

            {/* ADD/EDIT PESERTA MODAL FORM */}
            {isPesertaModalOpen && (
              <>
                <div onClick={() => setIsPesertaModalOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
                <form onSubmit={handleSavePeserta} style={{ backgroundColor: '#02050a' }} className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 max-h-[80vh] overflow-y-auto p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xl animate-scale-up">
                  <div className="col-span-1 md:col-span-2 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-2">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-400 uppercase">
                      {pesertaFormMode === 'tambah' ? 'Tambah Peserta Baru' : 'Ubah Biodata Peserta'}
                    </h4>
                    <button type="button" onClick={() => setIsPesertaModalOpen(false)} className="text-xs text-red-600 font-semibold">Batal</button>
                  </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">ID Peserta (ID unik)</label>
                  <input
                    type="text"
                    required
                    disabled={pesertaFormMode === 'edit'}
                    value={pesertaForm.idPeserta}
                    onChange={(e) => setPesertaForm(prev => ({ ...prev, idPeserta: e.target.value.toUpperCase() }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Nama Pangkalan (Sekolah / Gudep)</label>
                  <input
                    type="text"
                    required
                    value={pesertaForm.namaPangkalan}
                    onChange={(e) => setPesertaForm(prev => ({ ...prev, namaPangkalan: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: SMP Negeri 1 Bulukumpa"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Kategori (Jenis Kelamin)</label>
                  <select
                    value={pesertaForm.jenisKelamin}
                    onChange={(e) => setPesertaForm(prev => ({ ...prev, jenisKelamin: e.target.value as any }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Putra">Putra (Pa)</option>
                    <option value="Putri">Putri (Pi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Tingkatan</label>
                  <select
                    value={pesertaForm.tingkatan || 'Penggalang SD (SD/MI)'}
                    onChange={(e) => setPesertaForm(prev => ({ ...prev, tingkatan: e.target.value as any }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Penggalang SD (SD/MI)">Penggalang SD (SD/MI)</option>
                    <option value="Penggalang SMP (SMP/MTs)">Penggalang SMP (SMP/MTs)</option>
                    <option value="Penegak (SMA/MA/SMK)">Penegak (SMA/MA/SMK)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Status Keaktifan</label>
                  <select
                    value={pesertaForm.statusAktif ? "true" : "false"}
                    onChange={(e) => setPesertaForm(prev => ({ ...prev, statusAktif: e.target.value === "true" }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 pt-3">
                  <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-all"
                  >
                    Simpan Biodata Ke Spreadsheet
                  </button>
                </div>
              </form>
            </>
            )}
          </div>
        )}

        {/* TAB: DATA KEGIATAN */}
        {activeTab === 'kegiatan' && currentAdmin.level === 'Super Admin' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-6" id="activities-tab">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Jadwal Agenda & Perlombaan ({kegiatan.length})</h3>
                <p className="text-xs text-zinc-400">Atur rundown, urutan kegiatan perkemahan, dan status aktif untuk absensi.</p>
              </div>

              <button
                onClick={() => handleOpenKegiatanModal('tambah')}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Jadwal Kegiatan
              </button>
            </div>

            {/* FILTER & PRINT BAR */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-500 uppercase font-mono tracking-wider">Saring Tingkatan:</span>
                <select
                  value={filterKegiatanTingkatan}
                  onChange={(e) => setFilterKegiatanTingkatan(e.target.value as any)}
                  className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500 shadow-sm"
                >
                  <option value="Semua" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Semua Tingkatan</option>
                  <option value="Penggalang SD (SD/MI)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penggalang SD (SD/MI)</option>
                  <option value="Penggalang SMP (SMP/MTs)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penggalang SMP (SMP/MTs)</option>
                  <option value="Penegak (SMA/MA/SMK)" className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Penegak (SMA/MA/SMK)</option>
                </select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={async () => {
                    try {
                      await generateJadwalKegiatanPDF(filteredKegiatan, filterKegiatanTingkatan, settings);
                      onAddAuditLog("Cetak Jadwal Kegiatan", `Mengunduh PDF Jadwal Kegiatan (${filterKegiatanTingkatan})`);
                    } catch (err) {
                      console.error(err);
                      alert("Gagal mencetak Jadwal Perkemahan.");
                    }
                  }}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-pointer w-full sm:w-auto"
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Cetak Jadwal Perkemahan
                </button>
              </div>
            </div>

            {/* ACTIVITIES DIRECT LIST */}
            <div className="space-y-4">
              {filteredKegiatan.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                  Tidak ada jadwal kegiatan atau perlombaan yang cocok dengan filter.
                </div>
              ) : (
                filteredKegiatan.map((keg) => (
                <div key={keg.idKegiatan} className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-all flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-emerald-800 dark:text-emerald-500">#{keg.urutan} - {keg.idKegiatan}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        keg.status === 'Aktif' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {keg.status === 'Aktif' ? 'Aktif' : 'Selesai'}
                      </span>
                      {keg.tingkatan && keg.tingkatan.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded text-[9px] font-semibold border border-blue-100 dark:border-blue-900/30">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">{keg.namaKegiatan}</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-xs text-zinc-500">
                      <p>Hari: <b>{keg.hari}, {formatIndonesianDate(keg.tanggal)}</b></p>
                      <p>Waktu: {formatIndonesianTime(keg.jamMulai)} - {formatIndonesianTime(keg.jamSelesai)} WITA</p>
                      <p>Lokasi: <b>{keg.lokasi}</b></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-center">
                    <button
                      onClick={() => {
                        const newStatus = keg.status === 'Aktif' ? 'Selesai' : 'Aktif';
                        const updated = kegiatan.map(x => x.idKegiatan === keg.idKegiatan ? { ...x, status: newStatus } as Kegiatan : x);
                        onUpdateKegiatan(updated);
                        onAddAuditLog("Pembaruan Status Kegiatan", `Mengubah status kegiatan ${keg.idKegiatan} menjadi ${newStatus}`);
                      }}
                      className="text-xs bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                      title="Ubah Status"
                    >
                      Setel {keg.status === 'Aktif' ? 'Selesai' : 'Aktif'}
                    </button>
                    <button
                      onClick={() => handleOpenKegiatanModal('edit', keg)}
                      className="p-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteKegiatan(keg.idKegiatan)}
                      className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )))}
            </div>

            {/* ADD/EDIT KEGIATAN FORM MODAL */}
            {isKegiatanModalOpen && (
              <>
                <div onClick={() => setIsKegiatanModalOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
                <form onSubmit={handleSaveKegiatan} style={{ backgroundColor: '#000000' }} className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-50 max-h-[80vh] overflow-y-auto p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-2xl animate-scale-up">
                  <div className="col-span-1 md:col-span-3 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-2">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-400 uppercase">
                      {kegiatanFormMode === 'tambah' ? 'Tambah Kegiatan Perkemahan' : 'Edit Agenda Perkemahan'}
                    </h4>
                    <button type="button" onClick={() => setIsKegiatanModalOpen(false)} className="text-xs text-red-600 font-semibold">Batal</button>
                  </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">ID Kegiatan</label>
                  <input
                    type="text"
                    required
                    disabled={kegiatanFormMode === 'edit'}
                    value={kegiatanForm.idKegiatan}
                    onChange={(e) => setKegiatanForm(prev => ({ ...prev, idKegiatan: e.target.value.toUpperCase() }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 font-mono font-bold uppercase"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Nama Kegiatan</label>
                  <input
                    type="text"
                    required
                    value={kegiatanForm.namaKegiatan}
                    onChange={(e) => setKegiatanForm(prev => ({ ...prev, namaKegiatan: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: Lomba Pionering Kreatif"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Hari</label>
                  <select
                    value={kegiatanForm.hari}
                    onChange={(e) => setKegiatanForm(prev => ({ ...prev, hari: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 cursor-pointer"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={kegiatanForm.tanggal}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const calculatedDay = getIndonesianDayName(newDate);
                      setKegiatanForm(prev => ({
                        ...prev,
                        tanggal: newDate,
                        hari: calculatedDay || prev.hari
                      }));
                    }}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Urutan Rundown</label>
                  <input
                    type="number"
                    required
                    value={kegiatanForm.urutan}
                    onChange={(e) => setKegiatanForm(prev => ({ ...prev, urutan: Number(e.target.value) }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Jam Mulai (WITA)</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={startH || '08'}
                      onChange={(e) => {
                        const newH = e.target.value;
                        const newM = startM || '00';
                        setKegiatanForm(prev => ({ ...prev, jamMulai: `${newH}:${newM}` }));
                      }}
                      className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 cursor-pointer text-center font-mono text-zinc-800 dark:text-zinc-100"
                    >
                      {hoursArray.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-zinc-500 font-bold">:</span>
                    <select
                      value={startM || '00'}
                      onChange={(e) => {
                        const newH = startH || '08';
                        const newM = e.target.value;
                        setKegiatanForm(prev => ({ ...prev, jamMulai: `${newH}:${newM}` }));
                      }}
                      className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 cursor-pointer text-center font-mono text-zinc-800 dark:text-zinc-100"
                    >
                      {minutesArray.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Jam Selesai (WITA)</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={endH || '10'}
                      onChange={(e) => {
                        const newH = e.target.value;
                        const newM = endM || '00';
                        setKegiatanForm(prev => ({ ...prev, jamSelesai: `${newH}:${newM}` }));
                      }}
                      className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 cursor-pointer text-center font-mono text-zinc-800 dark:text-zinc-100"
                    >
                      {hoursArray.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-zinc-500 font-bold">:</span>
                    <select
                      value={endM || '00'}
                      onChange={(e) => {
                        const newH = endH || '10';
                        const newM = e.target.value;
                        setKegiatanForm(prev => ({ ...prev, jamSelesai: `${newH}:${newM}` }));
                      }}
                      className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 cursor-pointer text-center font-mono text-zinc-800 dark:text-zinc-100"
                    >
                      {minutesArray.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-1">Lokasi Lapangan</label>
                  <input
                    type="text"
                    required
                    value={kegiatanForm.lokasi}
                    onChange={(e) => setKegiatanForm(prev => ({ ...prev, lokasi: e.target.value }))}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2"
                    placeholder="Contoh: Sektor Perlombaan Barat"
                  />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <label className="block text-[10px] uppercase font-mono font-semibold text-zinc-500 mb-2">Tingkatan Sasaran Kegiatan (Checklist)</label>
                  <div className="flex flex-wrap gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg">
                    {['Penggalang SD (SD/MI)', 'Penggalang SMP (SMP/MTs)', 'Penegak (SMA/MA/SMK)'].map((level) => {
                      const list = kegiatanForm.tingkatan || [];
                      const isChecked = list.includes(level as any);
                      return (
                        <label key={level} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let newList = [...list];
                              if (e.target.checked) {
                                newList.push(level as any);
                              } else {
                                newList = newList.filter(item => item !== level);
                              }
                              setKegiatanForm(prev => ({ ...prev, tingkatan: newList as any }));
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                          />
                          {level}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-1 md:col-span-3 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                  >
                    Simpan Jadwal Kegiatan
                  </button>
                </div>
              </form>
            </>
            )}
          </div>
        )}

        {/* TAB: ABSENSI QR CODE SCANNER */}
        {activeTab === 'absensi' && (
          <div className="space-y-6" id="qr-absensi-tab">
            {/* DROP-DOWN SELECT KEGIATAN */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-400 mb-2">
                1. PILIH KEGIATAN YANG AKAN DIABSENSI
              </label>
              <select
                value={activeKegiatanId}
                onChange={(e) => {
                  setActiveKegiatanId(e.target.value);
                  const selectedName = kegiatan.find(k => k.idKegiatan === e.target.value)?.namaKegiatan || 'None';
                  onAddAuditLog("Mengubah Target Scan", `Admin memilih kegiatan ${e.target.value} (${selectedName}) untuk dipindai`);
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- PILIH KEGIATAN AKTIF --</option>
                {kegiatan.filter(k => k.status === 'Aktif').map((k) => (
                  <option key={k.idKegiatan} value={k.idKegiatan}>
                    [{k.idKegiatan}] {k.namaKegiatan} - {k.lokasi} ({k.hari})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-2">
                *Hanya kegiatan dengan status <b>'Aktif'</b> yang muncul di drop-down ini. Anda dapat mengaktifkannya di tab 'Data Kegiatan'.*
              </p>
            </div>

            {/* SCANNER CORE PANEL */}
            <ScannerComponent
              activeKegiatan={selectedKegiatan}
              pesertaList={peserta}
              kehadiranList={kehadiran}
              onScanSuccess={handleProcessScan}
              isOffline={isOffline}
              onToggleOffline={onToggleOffline}
              soundEnabled={settings.soundEnabled}
              onToggleSound={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
              speechEnabled={settings.speechEnabled}
              onToggleSpeech={() => onUpdateSettings({ ...settings, speechEnabled: !settings.speechEnabled })}
            />
          </div>
        )}

        {/* TAB: LAPORAN KEHADIRAN */}
        {activeTab === 'laporan' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-6" id="reports-tab">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Laporan Kehadiran & Rekap Absensi</h3>
                <p className="text-xs text-zinc-400">Filter, visualisasikan, cetak, dan ekspor laporan absensi secara instan.</p>
              </div>

              <div className="flex gap-2">
                {onPullData && (
                  <button
                    onClick={handleManualSync}
                    disabled={isManualSyncing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    {isManualSyncing ? 'Menarik...' : 'Tarik Data Terbaru'}
                  </button>
                )}
                <button
                  onClick={handlePrintLaporan}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Unduh Laporan (PDF)
                </button>
                <button
                  onClick={exportReportToCsv}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Ekspor Excel/CSV
                </button>
              </div>
            </div>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-150">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">Filter Kegiatan</label>
                <select
                  value={repKegiatanId}
                  onChange={(e) => setRepKegiatanId(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2"
                >
                  <option value="Semua">Semua Kegiatan</option>
                  {kegiatan.map(k => (
                    <option key={k.idKegiatan} value={k.idKegiatan}>[{k.idKegiatan}] {k.namaKegiatan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">Filter Pangkalan</label>
                <select
                  value={repPangkalan}
                  onChange={(e) => setRepPangkalan(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2"
                >
                  <option value="Semua">Semua Pangkalan</option>
                  {repPangkalanOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">Kategori Putra/Putri</label>
                <select
                  value={repJk}
                  onChange={(e) => setRepJk(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="Putra">Putra (Pa)</option>
                  <option value="Putri">Putri (Pi)</option>
                </select>
              </div>
            </div>

            {/* REPORT LOG TABLE */}
            <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 text-zinc-500">
                    <th className="p-3 font-semibold">Waktu Log</th>
                    <th className="p-3 font-semibold font-mono">ID Peserta</th>
                    <th className="p-3 font-semibold">Nama Pangkalan</th>
                    <th className="p-3 font-semibold">Kategori</th>
                    <th className="p-3 font-semibold">Kegiatan</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Petugas Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredKehadiranReport.length > 0 ? (
                    filteredKehadiranReport.map((log, index) => (
                      <tr key={log.id || `${log.idPeserta}_${log.idKegiatan}_${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 animate-fade-in">
                        <td className="p-3 font-mono text-zinc-400">{formatIndonesianDate(log.tanggal)} &bull; {formatIndonesianTime(log.jam)} WITA</td>
                        <td className="p-3 font-bold font-mono text-emerald-800 dark:text-emerald-500">{log.idPeserta}</td>
                        <td className="p-3 font-semibold">{log.namaPangkalan}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.jenisKelamin === 'Putra' 
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/30' 
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30'
                          }`}>
                            {log.jenisKelamin === 'Putra' ? 'Putra' : 'Putri'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{log.namaKegiatan}</td>
                        <td className="p-3 font-mono font-bold">
                          {log.statusHadir === 'Tidak Hadir' ? (
                            <span className="text-red-600 dark:text-red-400">✘ Tidak Hadir</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">✔ {log.statusHadir}</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 font-mono text-[11px]">{log.petugas}</td>
                      </tr>
                    ))
                  ) : (
                    <tr key="empty-filtered-kehadiran-report">
                      <td colSpan={7} className="p-6 text-center text-zinc-400 italic">
                        Tidak ada riwayat log absensi sesuai filter...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ATUR PENGUMUMAN */}
        {activeTab === 'pengumuman' && (
          <div className="space-y-6" id="pengumuman-tab">
            
            {/* INTRO HEADER & QUICK CONTROL */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-base uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Manajemen Pengumuman Camp & Alat Pengeras Suara (TTS)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Atur pengumuman yang tampil di Portal Login Peserta, dan putar suara pengumuman secara langsung di lapangan menggunakan Text-to-Speech (TTS).
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setAnnouncementForm({
                    judul: '',
                    konten: '',
                    tingkatanTarget: 'Semua',
                    statusAktif: true
                  });
                  setShowAddAnnouncementModal(true);
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm self-stretch md:self-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Buat Pengumuman Baru
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* FILTERING & ANNOUNCEMENTS LIST (8 COLS) */}
              <div className="xl:col-span-8 space-y-4">
                
                {/* FILTER CONTROLS */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Cari pengumuman..."
                      value={announcementSearch}
                      onChange={(e) => setAnnouncementSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div className="sm:w-56">
                    <select
                      value={announcementTargetFilter}
                      onChange={(e: any) => setAnnouncementTargetFilter(e.target.value)}
                      className="w-full p-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="Semua_Filter">Semua Target Regu</option>
                      <option value="Semua">Khusus Target: Semua</option>
                      <option value="Penggalang SD (SD/MI)">Penggalang SD (SD/MI)</option>
                      <option value="Penggalang SMP (SMP/MTs)">Penggalang SMP (SMP/MTs)</option>
                      <option value="Penegak (SMA/MA/SMK)">Penegak (SMA/MA/SMK)</option>
                    </select>
                  </div>
                </div>

                {/* ANNOUNCEMENT CARDS */}
                <div className="space-y-4">
                  {filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((ann) => (
                      <div 
                        key={ann.id} 
                        className={`bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm transition-all relative overflow-hidden ${
                          ann.statusAktif 
                            ? 'border-zinc-100 dark:border-zinc-800' 
                            : 'border-zinc-200/50 dark:border-zinc-800/40 opacity-60'
                        } ${isSpeakingId === ann.id ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-50/10 dark:bg-emerald-950/5' : ''}`}
                      >
                        {/* SPEAKING SOUNDWAVE OR STATUS DOT EFFECT */}
                        {isSpeakingId === ann.id && (
                          <div className="absolute right-4 top-4 flex items-center gap-1">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold uppercase tracking-wider mr-1">Sedang Memutar Audio</span>
                            <div className="flex gap-0.5 items-end h-3">
                              <span className="w-0.75 bg-emerald-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }}></span>
                              <span className="w-0.75 bg-emerald-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }}></span>
                              <span className="w-0.75 bg-emerald-500 rounded-full animate-bounce h-1" style={{ animationDelay: '0.5s' }}></span>
                              <span className="w-0.75 bg-emerald-500 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0.2s' }}></span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md font-bold uppercase">
                            {ann.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ann.tingkatanTarget === 'Semua' 
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300' 
                              : ann.tingkatanTarget === 'Penegak (SMA/MA/SMK)'
                              ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}>
                            Target: {ann.tingkatanTarget}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                            {formatIndonesianDate(ann.tanggal)} &bull; {formatIndonesianTime(ann.jam)} WITA
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-100 mb-1.5 uppercase tracking-tight">
                          {ann.judul}
                        </h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed font-normal whitespace-pre-line mb-4">
                          {ann.konten}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-400">
                              Dibuat oleh: <b className="text-zinc-600 dark:text-zinc-300">{ann.dibuatOleh}</b>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* TTS Broadcast Loudspeaker Trigger */}
                            <button
                              onClick={() => handleSpeakAnnouncement(ann)}
                              disabled={!ann.statusAktif}
                              className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                                !ann.statusAktif 
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                  : isSpeakingId === ann.id
                                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                              }`}
                              title={isSpeakingId === ann.id ? "Hentikan Suara" : "Putar Suara Pengumuman"}
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${isSpeakingId === ann.id ? 'animate-spin' : ''}`} />
                              {isSpeakingId === ann.id ? 'Hentikan TTS' : 'Putar Suara (Loudspeaker)'}
                            </button>

                            {/* Active Status Switch */}
                            <button
                              onClick={() => handleToggleAnnouncementStatus(ann.id)}
                              className={`text-xs font-bold py-1.5 px-2.5 rounded-lg border transition-colors ${
                                ann.statusAktif
                                  ? 'bg-zinc-50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50'
                                  : 'bg-zinc-50 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title="Ganti Status Aktif"
                            >
                              {ann.statusAktif ? 'Aktif' : 'Nonaktif'}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEditAnnouncement(ann)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Ubah Pengumuman"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id, ann.judul)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Hapus Pengumuman"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-12 rounded-2xl shadow-sm text-center">
                      <Megaphone className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Pengumuman tidak ditemukan</p>
                      <p className="text-xs text-zinc-400 mt-1">Coba gunakan kata kunci pencarian atau filter kategori lainnya.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LOUDSPEAKER AUDIO & TTS SETTINGS (4 COLS) */}
              <div className="xl:col-span-4 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <h4 className="font-bold text-xs uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Konfigurasi Pengeras Suara (TTS)
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Sesuaikan kualitas suara pengumuman sebelum disiarkan ke amplifier lapangan.
                    </p>
                  </div>

                  {/* VOICE SELECTOR */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                      Pilihan Suara (Voice)
                    </label>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none text-zinc-700 dark:text-zinc-300"
                    >
                      {voices.length > 0 ? (
                        voices.map((v, i) => (
                          <option key={i} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))
                      ) : (
                        <option value="">Suara Default Sistem</option>
                      )}
                    </select>
                    <p className="text-[9px] text-zinc-400 mt-1">
                      *Tergantung pada dukungan mesin text-to-speech bawaan dari browser/komputer Anda.
                    </p>
                  </div>

                  {/* RATE SLIDER */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500">
                        Kecepatan Suara (Rate): <span className="font-mono text-emerald-600 font-bold">{speechRate}x</span>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-400 font-mono mt-0.5">
                      <span>Lambat (Camp Ground)</span>
                      <span>Normal</span>
                      <span>Cepat</span>
                    </div>
                  </div>

                  {/* PITCH SLIDER */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500">
                        Intonasi Suara (Pitch): <span className="font-mono text-emerald-600 font-bold">{speechPitch}</span>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-400 font-mono mt-0.5">
                      <span>Rendah (Pria)</span>
                      <span>Normal</span>
                      <span>Tinggi (Wanita)</span>
                    </div>
                  </div>

                  {/* QUICK TEST AUDIO BUTTON */}
                  <button
                    onClick={() => {
                      const testText = "Sistem pengeras suara perkemahan Bulukumpa diaktifkan. Suara terdengar dengan jelas.";
                      speakIndonesianText(testText, {
                        rate: speechRate,
                        pitch: speechPitch,
                        voiceName: selectedVoiceName
                      });
                    }}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-zinc-200 dark:border-zinc-700"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Tes Suara Pengeras Suara
                  </button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-5 rounded-2xl space-y-2 text-xs text-amber-900 dark:text-amber-300">
                  <span className="font-bold flex items-center gap-1">
                    📢 Tips Penyiaran Lapangan:
                  </span>
                  <p className="leading-relaxed font-normal">
                    1. Hubungkan headphone jack perangkat admin ke <b>Ampli / Sound System lapangan</b> untuk menyiarkan pengumuman ini secara langsung di lokasi kemah.
                  </p>
                  <p className="leading-relaxed font-normal">
                    2. Disarankan menyetel <b>Kecepatan Suara di kisaran 0.8x - 0.9x</b> agar ucapan terdengar lebih jelas di area perkemahan terbuka yang memiliki gaung / gema tinggi.
                  </p>
                </div>
              </div>

            </div>

            {/* ADD/EDIT ANNOUNCEMENT MODAL */}
            {showAddAnnouncementModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 animate-scale-in">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200">
                      {editingAnnouncement ? 'Ubah Pengumuman' : 'Tambah Pengumuman Baru'}
                    </h3>
                    <button 
                      onClick={() => setShowAddAnnouncementModal(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                        Judul Pengumuman
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan judul pengumuman, contoh: Persiapan Makan Malam"
                        value={announcementForm.judul}
                        onChange={(e) => setAnnouncementForm({...announcementForm, judul: e.target.value})}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                        Isi / Konten Pengumuman
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tuliskan isi pengumuman secara lengkap dan jelas yang akan disuarakan dan ditampilkan..."
                        value={announcementForm.konten}
                        onChange={(e) => setAnnouncementForm({...announcementForm, konten: e.target.value})}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100 leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                          Target Regu / Kategori
                        </label>
                        <select
                          value={announcementForm.tingkatanTarget}
                          onChange={(e: any) => setAnnouncementForm({...announcementForm, tingkatanTarget: e.target.value})}
                          className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none text-zinc-800 dark:text-zinc-200 font-medium"
                        >
                          <option value="Semua">Semua Peserta</option>
                          <option value="Penggalang SD (SD/MI)">Penggalang SD (SD/MI)</option>
                          <option value="Penggalang SMP (SMP/MTs)">Penggalang SMP (SMP/MTs)</option>
                          <option value="Penegak (SMA/MA/SMK)">Penegak (SMA/MA/SMK)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-zinc-250 dark:border-zinc-700/60 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20">
                          <input
                            type="checkbox"
                            checked={announcementForm.statusAktif}
                            onChange={(e) => setAnnouncementForm({...announcementForm, statusAktif: e.target.checked})}
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-bold block text-zinc-700 dark:text-zinc-300">Status Aktif</span>
                            <span className="text-[10px] text-zinc-400">Tampilkan langsung ke peserta</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowAddAnnouncementModal(false)}
                        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md"
                      >
                        {editingAnnouncement ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: DOKUMEN KEGIATAN */}
        {activeTab === 'dokumen' && currentAdmin.level === 'Super Admin' && (
          <div className="space-y-6 animate-fade-in" id="dokumen-tab">
            {/* INTRO HEADER & QUICK CONTROL */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-base uppercase text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Manajemen Dokumen Kegiatan
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Kelola dokumen resmi perkemahan (Surat, Juknis, Panduan) untuk dibagikan secara otomatis kepada peserta berdasarkan tingkatan regunya.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingDoc(null);
                  setDocForm({ judul: '', linkDrive: '', tingkatan: 'Semua' });
                  setShowAddDocModal(true);
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                Tambah Dokumen
              </button>
            </div>

            {/* SEARCH AND FILTER BAR */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari judul dokumen..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
                <select
                  value={docTingkatanFilter}
                  onChange={(e: any) => setDocTingkatanFilter(e.target.value)}
                  className="p-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  <option value="Semua_Filter">Semua Tingkatan (Filter)</option>
                  <option value="Semua">Tingkatan: Semua</option>
                  <option value="Penggalang SD (SD/MI)">Tingkatan: Penggalang SD</option>
                  <option value="Penggalang SMP (SMP/MTs)">Tingkatan: Penggalang SMP</option>
                  <option value="Penegak (SMA/MA/SMK)">Tingkatan: Penegak</option>
                </select>
              </div>
            </div>

            {/* DOCUMENTS TABLE / LIST */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 font-semibold">Nama / Judul Dokumen</th>
                      <th className="p-3 font-semibold">Tingkatan Penerima</th>
                      <th className="p-3 font-semibold">Tanggal Upload</th>
                      <th className="p-3 font-semibold">Link Drive</th>
                      <th className="p-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors animate-fade-in">
                          <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-100 max-w-sm">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{doc.judul}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              doc.tingkatan === 'Semua'
                                ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                                : doc.tingkatan === 'Penggalang SD (SD/MI)'
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                                : doc.tingkatan === 'Penggalang SMP (SMP/MTs)'
                                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                                : 'bg-purple-50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300'
                            }`}>
                              {doc.tingkatan}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-zinc-400">{formatIndonesianDate(doc.tanggalUpload)}</td>
                          <td className="p-3">
                            <a
                              href={doc.linkDrive}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                            >
                              <span>Buka Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStartEditDoc(doc)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                title="Ubah Dokumen"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.judul)}
                                className="p-1.5 text-rose-500 hover:text-rose-750 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key="empty-documents-list">
                        <td colSpan={5} className="p-12 text-center text-zinc-400 italic">
                          <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">Dokumen tidak ditemukan</p>
                          <p className="text-[11px] text-zinc-400 mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter tingkatan.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ADD/EDIT DOCUMENT MODAL */}
            {showAddDocModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 animate-scale-in">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200">
                      {editingDoc ? 'Ubah Dokumen' : 'Tambah Dokumen Baru'}
                    </h3>
                    <button
                      onClick={() => setShowAddDocModal(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveDoc} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                        Judul Dokumen
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan judul dokumen, contoh: Surat Izin Kwaran Ranting Bulukumpa"
                        value={docForm.judul}
                        onChange={(e) => setDocForm({ ...docForm, judul: e.target.value })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                        Link Google Drive Dokumen
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://drive.google.com/..."
                        value={docForm.linkDrive}
                        onChange={(e) => setDocForm({ ...docForm, linkDrive: e.target.value })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-zinc-500 mb-1">
                        Tingkatan (Akses Lihat)
                      </label>
                      <select
                        value={docForm.tingkatan}
                        onChange={(e: any) => setDocForm({ ...docForm, tingkatan: e.target.value })}
                        className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none text-zinc-800 dark:text-zinc-100 font-medium"
                      >
                        <option value="Semua">Semua Tingkatan (Dapat Dilihat Semua)</option>
                        <option value="Penggalang SD (SD/MI)">Penggalang SD (SD/MI)</option>
                        <option value="Penggalang SMP (SMP/MTs)">Penggalang SMP (SMP/MTs)</option>
                        <option value="Penegak (SMA/MA/SMK)">Penegak (SMA/MA/SMK)</option>
                      </select>
                      <p className="text-[9px] text-zinc-400 mt-1">
                        *Hanya peserta dengan tingkatan terpilih yang dapat melihat dokumen ini di Dashboard Peserta.*
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowAddDocModal(false)}
                        className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors shadow-md"
                      >
                        {editingDoc ? 'Simpan Perubahan' : 'Simpan Dokumen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: PENGATURAN & AUDIT LOG */}
        {activeTab === 'pengaturan' && currentAdmin.level === 'Super Admin' && (
          <div className="space-y-6" id="settings-tab">
            {/* ADMINS MANAGEMENT */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200">Daftar Akun Admin & Panitia</h3>
                  <p className="text-[11px] text-zinc-400">Daftar operator yang berwenang memindai QR Code di lapangan.</p>
                </div>
                {currentAdmin.level === 'Super Admin' && (
                  <button
                    onClick={() => setIsAddAdminOpen(!isAddAdminOpen)}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Akun
                  </button>
                )}
              </div>

              {isAddAdminOpen && (
                <form onSubmit={handleAddAdmin} className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-5 gap-3 animate-fade-in">
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm(p => ({ ...p, username: e.target.value }))}
                    className="text-xs bg-white dark:bg-zinc-900 border p-2 rounded-lg text-zinc-800 dark:text-zinc-100"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(p => ({ ...p, password: e.target.value }))}
                    className="text-xs bg-white dark:bg-zinc-900 border p-2 rounded-lg text-zinc-800 dark:text-zinc-100"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nama Operator"
                    value={adminForm.nama}
                    onChange={(e) => setAdminForm(p => ({ ...p, nama: e.target.value }))}
                    className="text-xs bg-white dark:bg-zinc-900 border p-2 rounded-lg text-zinc-800 dark:text-zinc-100"
                  />
                  <select
                    value={adminForm.level || 'Panitia'}
                    onChange={(e) => setAdminForm(p => ({ ...p, level: e.target.value as any }))}
                    className="text-xs bg-white dark:bg-zinc-900 border p-2 rounded-lg text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="Panitia">Panitia</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  <button type="submit" className="bg-emerald-800 text-white text-xs font-bold rounded-lg py-2">
                    Simpan Admin
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map((adm) => {
                  const isEditingThisAdmin = editingAdmin?.username === adm.username;
                  if (isEditingThisAdmin) {
                    return (
                      <form
                        key={adm.username}
                        onSubmit={handleSaveEditAdmin}
                        className="p-3 rounded-xl border border-emerald-500 bg-zinc-900 space-y-2 col-span-1 md:col-span-2"
                      >
                        <div className="text-xs font-bold text-emerald-400 mb-1">
                          Edit Akun: {adm.username}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Nama Operator"
                            value={editAdminForm.nama}
                            onChange={(e) => setEditAdminForm(p => ({ ...p, nama: e.target.value }))}
                            className="text-xs bg-zinc-800 dark:bg-zinc-900 text-white border border-zinc-700 p-2 rounded-lg"
                          />
                          <input
                            type="password"
                            required
                            placeholder="Password Baru"
                            value={editAdminForm.password}
                            onChange={(e) => setEditAdminForm(p => ({ ...p, password: e.target.value }))}
                            className="text-xs bg-zinc-800 dark:bg-zinc-900 text-white border border-zinc-700 p-2 rounded-lg"
                          />
                          <select
                            value={editAdminForm.level}
                            onChange={(e) => setEditAdminForm(p => ({ ...p, level: e.target.value as any }))}
                            className="text-xs bg-zinc-800 dark:bg-zinc-900 text-white border border-zinc-700 p-2 rounded-lg"
                          >
                            <option value="Panitia">Panitia</option>
                            <option value="Super Admin">Super Admin</option>
                          </select>
                          <div className="flex gap-2">
                            <button type="submit" className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg px-3 py-2 flex-1">
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAdmin(null)}
                              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-bold rounded-lg px-3 py-2"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div key={adm.username} style={{ backgroundColor: '#000000' }} className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{adm.nama}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Username: {adm.username} &bull; Level: {adm.level}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentAdmin.level === 'Super Admin' && (
                          <div className="flex gap-1.5 mr-2">
                            <button
                              onClick={() => handleStartEditAdmin(adm)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Edit Akun"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(adm.username)}
                              className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EVENT IDENTITY SETTINGS */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Pengaturan Identitas Event / Kegiatan
              </h3>
              <p className="text-xs text-zinc-400">
                Sesuaikan informasi utama kegiatan perkemahan. Perubahan akan disinkronkan secara real-time ke seluruh visual aplikasi, ID Card, jadwal perkemahan, dan kop bahan cetak PDF.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nama Kegiatan / Event
                  </label>
                  <input
                    type="text"
                    value={settings.namaEvent || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, namaEvent: e.target.value })}
                    placeholder="Contoh: Perkemahan Bakti Penegak & Penggalang Kwartir Ranting Bulukumpa"
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Lokasi Kegiatan
                    </label>
                    <input
                      type="text"
                      value={settings.lokasiEvent || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, lokasiEvent: e.target.value })}
                      placeholder="Contoh: Bumi Perkemahan Bulukumpa"
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Pelaksana / Penyelenggara Kegiatan
                    </label>
                    <input
                      type="text"
                      value={settings.pelaksanaEvent || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, pelaksanaEvent: e.target.value })}
                      placeholder="Contoh: Kwartir Ranting Gerakan Pramuka Bulukumpa"
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Logo Kegiatan (Direct URL Gambar)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <input
                      type="text"
                      value={settings.logoUrl || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, logoUrl: e.target.value })}
                      placeholder="Contoh: https://i.ibb.co/logo-pramuka.png (Gunakan direct link gambar berformat PNG/JPG)"
                      className="flex-1 w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm font-medium"
                    />
                    {settings.logoUrl && settings.logoUrl.trim() !== '' && (
                      <div className="relative h-11 w-11 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-800 p-1 flex items-center justify-center overflow-hidden shadow-inner">
                        <img 
                          src={settings.logoUrl} 
                          alt="Pratinjau Logo" 
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    *Masukkan URL tautan langsung gambar. Logo ini akan dicetak di kiri atas secara proporsional pada semua Laporan, ID Card, dan Kartu QR Code.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      onAddAuditLog("Pembalikan Identitas Event", `Mengubah nama event: "${settings.namaEvent}", lokasi: "${settings.lokasiEvent}", pelaksana: "${settings.pelaksanaEvent}", logo: "${settings.logoUrl || ''}"`);
                      alert("Identitas Event berhasil diperbarui dan disinkronkan ke seluruh sistem!");
                    }}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Simpan & Terapkan Perubahan
                  </button>
                </div>
              </div>
            </div>

            {/* BACKUP & RESTORE */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Pencadangan (Backup & Restore) Database
              </h3>
              <p className="text-xs text-zinc-400">
                Pencadangan aman dalam bentuk file JSON. Anda dapat mengekspor seluruh database (Peserta, Kegiatan, Kehadiran, Akun Admin) sewaktu-waktu dan memulihkannya kembali secara instan.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleBackupDatabase}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Backup Lengkap (.json)
                </button>
                
                <label className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-250">
                  <Upload className="w-4 h-4" />
                  Restore / Upload Backup (.json)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreDatabase}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GOOGLE SHEETS SETUP */}
        {activeTab === 'gas' && currentAdmin.level === 'Super Admin' && (
          <GasExportPanel
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            peserta={peserta}
            onUpdatePeserta={onUpdatePeserta}
            kegiatan={kegiatan}
            onUpdateKegiatan={onUpdateKegiatan}
            kehadiran={kehadiran}
            onUpdateKehadiran={onUpdateKehadiran}
            announcements={announcements}
            onUpdateAnnouncements={onUpdateAnnouncements}
            documents={documents}
            onUpdateDocuments={onUpdateDocuments}
            pangkalanDetails={pangkalanDetails}
            onUpdatePangkalanDetails={onUpdatePangkalanDetails}
            admins={admins}
            onUpdateAdmins={onUpdateAdmins}
            onAddAuditLog={onAddAuditLog}
          />
        )}
      </div>

      {/* HIGH-FIDELITY PRINT AREA CONTAINER */}
      {printTarget && (
        <div id="print-area" className="hidden print:block bg-white text-black p-8 font-sans">
          {printTarget.type === 'kartu' ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 border-4 border-emerald-800 rounded-3xl max-w-sm mx-auto bg-white">
              <div className="bg-emerald-800 text-white text-[11px] font-bold tracking-widest px-4 py-1.5 rounded-full uppercase mb-4">
                Kartu Absensi Pramuka
              </div>
              <h2 className="text-xl font-black uppercase text-zinc-900 mb-1 leading-tight">
                {printTarget.data.namaPangkalan}
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">
                Kwartir Ranting Bulukumpa
              </p>
              
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-center w-48 h-48 mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(printTarget.data.idPeserta)}`}
                  alt="QR Code Absen"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1.5 font-mono text-xs text-zinc-700 w-full">
                <div className="flex justify-between border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400">ID PESERTA:</span>
                  <span className="font-bold text-emerald-800">{printTarget.data.idPeserta}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400">KATEGORI:</span>
                  <span className="font-bold">{printTarget.data.jenisKelamin === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">TINGKATAN:</span>
                  <span className="font-bold">{printTarget.data.tingkatan || 'Penggalang (SD/MI)'}</span>
                </div>
              </div>

              <p className="text-[9px] text-zinc-400 leading-normal border-t border-dashed border-zinc-200 pt-3 mt-4">
                Gunakan kode QR ini untuk melakukan scan absensi kehadiran pada setiap kegiatan perkemahan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center border-b-4 border-double border-zinc-900 pb-4">
                <h1 className="text-2xl font-black uppercase tracking-wide">Laporan Kehadiran & Rekap Absensi</h1>
                <h2 className="text-lg font-bold uppercase tracking-wider mt-1">Kemah Bakti & Lomba Pramuka Kwartir Bulukumpa</h2>
                <p className="text-xs font-mono text-zinc-500 mt-2">
                  Dicetak pada: {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' })} WITA
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>Filter Kegiatan: <span className="font-bold text-emerald-800">{repKegiatanId === 'Semua' ? 'Semua Kegiatan' : repKegiatanId}</span></div>
                <div>Filter Pangkalan: <span className="font-bold text-emerald-800">{repPangkalan === 'Semua' ? 'Semua Pangkalan' : repPangkalan}</span></div>
                <div>Kategori Regu: <span className="font-bold text-emerald-800">{repJk === 'Semua' ? 'Semua Kategori' : (repJk === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)')}</span></div>
                <div>Total Records: <span className="font-bold text-emerald-800">{printTarget.data.length} Absensi</span></div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 border border-zinc-300">
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Waktu Log</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">ID Peserta</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Nama Pangkalan</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Kategori</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Kegiatan</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Status</th>
                    <th className="p-2 border border-zinc-300 font-bold uppercase">Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {printTarget.data.length > 0 ? (
                    printTarget.data.map((log: any, index: number) => (
                      <tr key={index} className="border border-zinc-200 hover:bg-zinc-50">
                        <td className="p-2 border border-zinc-200 font-mono text-[11px]">{formatIndonesianDate(log.tanggal)} &bull; {formatIndonesianTime(log.jam)} WITA</td>
                        <td className="p-2 border border-zinc-200 font-mono font-bold text-emerald-800">{log.idPeserta}</td>
                        <td className="p-2 border border-zinc-200 font-bold">{log.namaPangkalan}</td>
                        <td className="p-2 border border-zinc-200">{log.jenisKelamin === 'Putra' ? 'Putra' : 'Putri'}</td>
                        <td className="p-2 border border-zinc-200 font-semibold">{log.namaKegiatan}</td>
                        <td className="p-2 border border-zinc-200 font-bold">
                          {log.statusHadir === 'Tidak Hadir' ? (
                            <span className="text-red-600">✘ Tidak Hadir</span>
                          ) : (
                            <span className="text-emerald-700">✔ {log.statusHadir}</span>
                          )}
                        </td>
                        <td className="p-2 border border-zinc-200 font-mono text-[11px]">{log.petugas}</td>
                      </tr>
                    ))
                  ) : (
                    <tr key="empty-print-target-list">
                      <td colSpan={7} className="p-8 text-center italic text-zinc-400 border border-zinc-200">
                        Tidak ada riwayat log absensi sesuai filter...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pt-12 flex justify-between text-xs text-center">
                <div className="w-48">
                  <p>Mengetahui,</p>
                  <p className="font-bold">Ketua Panitia Pelaksana</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">_______________________</p>
                </div>
                <div className="w-64">
                  <p>Bulukumpa, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold">Koordinator Humas & Dokumentasi</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">_______________________</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
