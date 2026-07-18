/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, Volume2, VolumeX, ShieldAlert, Sparkles, AlertCircle, WifiOff, Wifi, CornerDownLeft, Upload, Image, Keyboard, Barcode, Check } from 'lucide-react';
import { Kegiatan, Peserta, Kehadiran, formatIndonesianTime } from '../types';
import { speakIndonesianText } from '../lib/tts';

interface ScannerComponentProps {
  activeKegiatan: Kegiatan | null;
  pesertaList: Peserta[];
  kehadiranList: Kehadiran[];
  onScanSuccess: (idPeserta: string) => { status: 'success' | 'warn' | 'error'; message: string; subtext?: string };
  onBulkScanSuccess?: (idPesertas: string[]) => { successCount: number; duplicateCount: number; errorCount: number; messages: string[] };
  isOffline: boolean;
  onToggleOffline: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  onPushData?: (silent?: boolean) => Promise<boolean>;
  onPullData?: (silent?: boolean) => Promise<boolean>;
}

export default function ScannerComponent({
  activeKegiatan,
  pesertaList,
  kehadiranList,
  onScanSuccess,
  onBulkScanSuccess,
  isOffline,
  onToggleOffline,
  soundEnabled,
  onToggleSound,
  speechEnabled,
  onToggleSpeech,
  onPushData,
  onPullData
}: ScannerComponentProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualId, setManualId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [scanMethod, setScanMethod] = useState<'camera' | 'hardware'>('camera');
  const [autoFocusHardware, setAutoFocusHardware] = useState<boolean>(true);
  const [hardwareInput, setHardwareInput] = useState<string>('');
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scanMethod === 'hardware' && autoFocusHardware) {
      const focusInput = () => {
        if (hardwareInputRef.current) {
          hardwareInputRef.current.focus();
        }
      };

      // Focus initially
      focusInput();

      const handleBlur = () => {
        setTimeout(() => {
          if (scanMethod === 'hardware' && autoFocusHardware) {
            hardwareInputRef.current?.focus();
          }
        }, 100);
      };

      const inputEl = hardwareInputRef.current;
      inputEl?.addEventListener('blur', handleBlur);

      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (scanMethod === 'hardware' && autoFocusHardware) {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            return;
          }
          hardwareInputRef.current?.focus();
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);

      return () => {
        inputEl?.removeEventListener('blur', handleBlur);
        window.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, [scanMethod, autoFocusHardware]);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'warn' | 'error' | null;
    title: string;
    message: string;
    subtext: string;
    timestamp: string;
  }>({
    type: null,
    title: '',
    message: '',
    subtext: '',
    timestamp: ''
  });

  const [batchMode, setBatchMode] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [scanFocusMode, setScanFocusMode] = useState<'qr' | 'barcode' | 'full'>('qr');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);
  const [fileScanning, setFileScanning] = useState<boolean>(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  const handleManualSyncSpreadsheet = async () => {
    if (!onPushData) return;
    setIsSyncingSpreadsheet(true);
    try {
      await onPushData(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingSpreadsheet(false);
    }
  };

  const handleRefreshBarcodeDb = async () => {
    if (!onPullData) return;
    setIsPulling(true);
    try {
      const success = await onPullData(false);
      if (success) {
        announceVoice("Database barcode berhasil diperbarui");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPulling(false);
    }
  };

  // List of all unique school/base names filtered by activeKegiatan's levels (tingkatan)
  const uniquePangkalanList = React.useMemo(() => {
    let list = pesertaList;
    if (activeKegiatan && activeKegiatan.tingkatan && activeKegiatan.tingkatan.length > 0) {
      list = pesertaList.filter(p => {
        return p.tingkatan ? activeKegiatan.tingkatan.includes(p.tingkatan) : true;
      });
    }
    const set = new Set(list.map(p => p.namaPangkalan));
    return Array.from(set).sort();
  }, [pesertaList, activeKegiatan]);

  // Filtered list of school names
  const filteredPangkalanList = React.useMemo(() => {
    if (!schoolSearchQuery) return uniquePangkalanList;
    const lowerQuery = schoolSearchQuery.toLowerCase();
    return uniquePangkalanList.filter(p => p.toLowerCase().includes(lowerQuery));
  }, [uniquePangkalanList, schoolSearchQuery]);

  const scannedPeserta = React.useMemo(() => {
    if (!lastScannedCode) return null;
    const searchCode = String(lastScannedCode).trim().toUpperCase();
    return pesertaList.find(x => 
      String(x.idPeserta || '').trim().toUpperCase() === searchCode || 
      String(x.kodeQr || '').trim().toUpperCase() === searchCode
    ) || null;
  }, [lastScannedCode, pesertaList]);

  // Group the pangkalan list by their level (tingkatan)
  const groupedPangkalan = React.useMemo(() => {
    const pangkalanToLevelMap: Record<string, string> = {};
    pesertaList.forEach(p => {
      if (p.namaPangkalan && p.tingkatan) {
        pangkalanToLevelMap[p.namaPangkalan] = p.tingkatan;
      }
    });

    const sdList: string[] = [];
    const smpList: string[] = [];
    const smaList: string[] = [];

    filteredPangkalanList.forEach(pangkalan => {
      const level = pangkalanToLevelMap[pangkalan];
      if (level === 'Penggalang SD (SD/MI)') {
        sdList.push(pangkalan);
      } else if (level === 'Penggalang SMP (SMP/MTs)') {
        smpList.push(pangkalan);
      } else if (level === 'Penegak (SMA/MA/SMK)') {
        smaList.push(pangkalan);
      } else {
        const lowerName = pangkalan.toLowerCase();
        if (lowerName.includes('sd') || lowerName.includes('mi')) {
          sdList.push(pangkalan);
        } else if (lowerName.includes('smp') || lowerName.includes('mts')) {
          smpList.push(pangkalan);
        } else if (lowerName.includes('sma') || lowerName.includes('smk') || lowerName.includes('ma')) {
          smaList.push(pangkalan);
        } else {
          sdList.push(pangkalan);
        }
      }
    });

    return {
      sdList,
      smpList,
      smaList
    };
  }, [filteredPangkalanList, pesertaList]);

  // Statistics of schools/pangkalans presence for the active activity
  const schoolStats = React.useMemo(() => {
    if (!activeKegiatan) return null;

    let totalPutraExpected = 0;
    let presentPutra = 0;
    let totalPutriExpected = 0;
    let presentPutri = 0;

    uniquePangkalanList.forEach(pangkalan => {
      const pesertaPutra = pesertaList.find(p => 
        p.namaPangkalan === pangkalan && 
        p.jenisKelamin === 'Putra' &&
        (!activeKegiatan.tingkatan || activeKegiatan.tingkatan.length === 0 || (p.tingkatan && activeKegiatan.tingkatan.includes(p.tingkatan)))
      );
      const pesertaPutri = pesertaList.find(p => 
        p.namaPangkalan === pangkalan && 
        p.jenisKelamin === 'Putri' &&
        (!activeKegiatan.tingkatan || activeKegiatan.tingkatan.length === 0 || (p.tingkatan && activeKegiatan.tingkatan.includes(p.tingkatan)))
      );

      const hasPutra = !!pesertaPutra;
      const hasPutri = !!pesertaPutri;
      const isPutraActive = pesertaPutra ? pesertaPutra.statusAktif : true;
      const isPutriActive = pesertaPutri ? pesertaPutri.statusAktif : true;

      if (hasPutra && isPutraActive) {
        totalPutraExpected++;
        const isPresent = kehadiranList.some(h => h.idKegiatan === activeKegiatan.idKegiatan && h.namaPangkalan === pangkalan && h.jenisKelamin === 'Putra');
        if (isPresent) presentPutra++;
      }

      if (hasPutri && isPutriActive) {
        totalPutriExpected++;
        const isPresent = kehadiranList.some(h => h.idKegiatan === activeKegiatan.idKegiatan && h.namaPangkalan === pangkalan && h.jenisKelamin === 'Putri');
        if (isPresent) presentPutri++;
      }
    });

    return {
      presentPutra,
      totalPutraExpected,
      presentPutri,
      totalPutriExpected,
      totalPresent: presentPutra + presentPutri,
      totalExpected: totalPutraExpected + totalPutriExpected
    };
  }, [uniquePangkalanList, pesertaList, kehadiranList, activeKegiatan]);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader-viewport";

  // Web Audio Context for synthesized success/error beeps
  const playBeep = (type: 'success' | 'warn' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'success') {
        // High, pleasant double beep
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(660, ctx.currentTime); // Mi
        osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // La
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        
        osc1.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.25);
      } else if (type === 'warn') {
        // Warning dual medium beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Harsh low error buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.setValueAtTime(120, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  };

  // Text to Speech announcement
  const announceVoice = (text: string) => {
    if (!speechEnabled) return;
    speakIndonesianText(text, {
      rate: 1.0,
      pitch: 1.0
    });
  };

  // List available camera devices on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setCameraError(null);
          // Prefer back camera if available, otherwise first camera
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') || 
            device.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError("Kamera tidak ditemukan. Harap pastikan perangkat Anda memiliki kamera yang berfungsi.");
        }
      })
      .catch((err) => {
        console.error("Gagal mendapatkan daftar kamera:", err);
        const errMsg = err?.message || String(err);
        setCameraError(errMsg);
      });

    return () => {
      stopScanning();
    };
  }, []);

  // Restart scanner when focus mode changes and we are already active
  useEffect(() => {
    if (isScanning && selectedCameraId) {
      startScanning(selectedCameraId, scanFocusMode);
    }
  }, [scanFocusMode]);

  const startScanning = async (camId = selectedCameraId, focusMode = scanFocusMode) => {
    if (!camId) return;
    if (html5QrcodeRef.current) {
      await stopScanning();
    }

    try {
      // Initialize with full support for both standard barcodes and QR codes
      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.PDF_417
        ],
        useBarCodeDetectorIfSupported: false, // Forces highly reliable, fully cross-platform JS/WASM engine
        verbose: false
      });
      html5QrcodeRef.current = html5Qrcode;
      
      // Determine safe qrbox based on focusMode
      let qrboxConfig: any = undefined;
      
      if (focusMode === 'qr') {
        qrboxConfig = (width: number, height: number) => {
          // Robust fallback to prevent 0 or negative crop box sizes
          const safeW = width > 0 ? width : 640;
          const safeH = height > 0 ? height : 480;
          const size = Math.min(safeW, safeH) * 0.75;
          const finalSize = Math.max(Math.floor(size), 150);
          const boxW = Math.min(finalSize, safeW - 20);
          const boxH = Math.min(finalSize, safeH - 20);
          return { width: Math.max(boxW, 120), height: Math.max(boxH, 120) };
        };
      } else if (focusMode === 'barcode') {
        qrboxConfig = (width: number, height: number) => {
          const safeW = width > 0 ? width : 640;
          const safeH = height > 0 ? height : 480;
          const w = Math.min(Math.floor(safeW * 0.85), 480);
          const h = Math.min(Math.floor(safeH * 0.45), 180);
          const boxW = Math.max(w, 150);
          const boxH = Math.max(h, 80);
          const finalW = Math.min(boxW, safeW - 20);
          const finalH = Math.min(boxH, safeH - 20);
          return { width: Math.max(finalW, 120), height: Math.max(finalH, 60) };
        };
      } // 'full' leaves qrboxConfig as undefined, which scans the whole frame!
      
      await html5Qrcode.start(
        camId,
        {
          fps: 15, // 15 fps reduces processor load and makes barcode detection much more stable
          qrbox: qrboxConfig,
          aspectRatio: focusMode === 'barcode' ? 1.777778 : undefined
        },
        (decodedText) => {
          handleDecodedTextRef.current(decodedText);
        },
        (errorMessage) => {
          // Silent failure for periodic scans
        }
      );
      setIsScanning(true);
      setCameraError(null);
    } catch (err) {
      console.error("Gagal memulai scanner:", err);
      const errMsg = err?.message || String(err);
      setCameraError(errMsg);
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        console.error("Gagal menghentikan scanner:", err);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Toggle active scan session
  const toggleScanState = () => {
    if (isScanning) {
      stopScanning();
    } else {
      if (!activeKegiatan) {
        setScanResult({
          type: 'error',
          title: 'ERROR',
          message: 'Pilih Kegiatan Terlebih Dahulu!',
          subtext: 'Admin harus memilih kegiatan sebelum memindai QR Code.',
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
        playBeep('error');
        announceVoice('Pilih kegiatan terlebih dahulu');
        return;
      }
      startScanning();
    }
  };

  // Cycle through available cameras in one tap
  const cycleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(cam => cam.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;
    setSelectedCameraId(nextCameraId);
    if (isScanning) {
      startScanning(nextCameraId);
    }
  };

  // Handle file upload and QR/Barcode scan from image
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    
    // Stop active camera scan to avoid conflict and device lock
    const wasScanning = isScanning;
    if (isScanning) {
      await stopScanning();
    }

    try {
      const tempId = "file-scan-temp-div";
      let tempDiv = document.getElementById(tempId);
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
      }

      const html5QrcodeScanner = new Html5Qrcode(tempId);
      const decodedText = await html5QrcodeScanner.scanFile(file, false);
      
      // Found code! Process it
      handleDecodedTextRef.current(decodedText);
      
      // Clean up
      html5QrcodeScanner.clear();
    } catch (err) {
      console.error("Gagal memindai file:", err);
      setScanResult({
        type: 'error',
        title: '❌ GAGAL SCAN FILE',
        message: 'Kode Tidak Terdeteksi',
        subtext: 'Pastikan foto QR Code / Barcode cukup terang, fokus, dan tidak terpotong.',
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
      playBeep('error');
      announceVoice("Gagal memindai file");
    } finally {
      setFileScanning(false);
      // Reset input value to allow scanning the same file again
      e.target.value = '';
      
      // Restart scanning if it was active
      if (wasScanning) {
        setTimeout(() => {
          startScanning();
        }, 300);
      }
    }
  };

  // Handle camera switch
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (isScanning) {
      startScanning(newId);
    }
  };

  // Core processing logic when a QR code string is obtained
  const handleDecodedText = (code: string) => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return;

    // Prevention of double scan in tight loops (batch mode throttle of 2.5s)
    const now = Date.now();
    if (trimmedCode === lastScannedCode && (now - lastScannedTime < 2500)) {
      return; // Ignore repetitive fast scan
    }

    setLastScannedCode(trimmedCode);
    setLastScannedTime(now);

    if (!activeKegiatan) {
      setScanResult({
        type: 'error',
        title: 'KATA KUNCI EROR',
        message: 'Kegiatan Belum Dipilih!',
        subtext: 'Pilih kegiatan di menu drop-down di atas.',
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
      playBeep('error');
      announceVoice("Error, kegiatan belum dipilih");
      return;
    }

    // If offline mode is enabled, let's store it locally
    if (isOffline) {
      const peserta = pesertaList.find(p => 
        String(p.idPeserta || '').trim().toUpperCase() === trimmedCode || 
        String(p.kodeQr || '').trim().toUpperCase() === trimmedCode
      );
      if (peserta) {
        // Check if already in queue (only keep 1 data per participant)
        const isDuplicate = offlineQueue.some(item => {
          const p = pesertaList.find(x => {
            const trimmedItem = String(item).trim().toUpperCase();
            return String(x.idPeserta || '').trim().toUpperCase() === trimmedItem || 
                   String(x.kodeQr || '').trim().toUpperCase() === trimmedItem;
          });
          return p && p.idPeserta === peserta.idPeserta;
        });

        if (isDuplicate) {
          setScanResult({
            type: 'warn',
            title: 'DUPLIKAT OFFLINE',
            message: `Sudah Terdaftar di Antrean`,
            subtext: `${peserta.namaPangkalan} (${peserta.jenisKelamin === 'Putra' ? 'Putra' : 'Putri'}) - ID: ${peserta.idPeserta} sudah ada di antrean offline.`,
            timestamp: new Date().toLocaleTimeString('id-ID')
          });
          playBeep('warn');
          announceVoice("Sudah ada di antrean");
          return;
        }

        // Enqueue offline scan
        setOfflineQueue(prev => [...prev, trimmedCode]);
        setScanResult({
          type: 'success',
          title: 'OFFLINE SAVED',
          message: `Tersimpan (Offline): ${peserta.namaPangkalan}`,
          subtext: `${peserta.jenisKelamin === 'Putra' ? 'Putra (Pa)' : 'Putri (Pi)'} - ID: ${peserta.idPeserta}. Akan disinkronkan saat online.`,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
        playBeep('success');
        announceVoice(`Offline Berhasil. ${peserta.namaPangkalan}`);
      } else {
        setScanResult({
          type: 'error',
          title: 'QR TIDAK TERDAFTAR',
          message: `ID ${trimmedCode} Tidak Dikenal`,
          subtext: 'ID Peserta tidak terdaftar di database.',
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
        playBeep('error');
        announceVoice("QR tidak terdaftar");
      }
      return;
    }

    // Normal Online Scan Process
    const result = onScanSuccess(trimmedCode);
    
    setScanResult({
      type: result.status,
      title: result.status === 'success' ? '✅ HADIR' : result.status === 'warn' ? '⚠ DUPLIKAT' : '❌ EROR',
      message: result.message,
      subtext: result.subtext || '',
      timestamp: new Date().toLocaleTimeString('id-ID')
    });

    playBeep(result.status);
    
    // Voice feedback
    if (result.status === 'success') {
      const pangkalanName = result.subtext ? result.subtext.split(' - ')[0] : '';
      announceVoice(`Hadir, ${pangkalanName}`);
    } else if (result.status === 'warn') {
      announceVoice("Sudah absen");
    } else {
      // Speak the actual error message to be highly specific and accurate
      if (result.message && result.message.toLowerCase().includes("tidak dikenal")) {
        announceVoice("Kode QR tidak terdaftar");
      } else {
        announceVoice(result.message || "Kode QR tidak terdaftar");
      }
    }

    // If batchMode is false, stop scanner automatically after single scan
    if (!batchMode && result.status === 'success') {
      stopScanning();
    }
  };

  // Keep handleDecodedText reference fresh for third-party Html5Qrcode callbacks
  const handleDecodedTextRef = useRef<typeof handleDecodedText>(handleDecodedText);
  handleDecodedTextRef.current = handleDecodedText;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleDecodedTextRef.current(manualId.trim());
    setManualId('');
  };

  const handleHardwareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = hardwareInput.trim();
    if (!code) return;
    handleDecodedTextRef.current(code);
    setHardwareInput('');
  };

  // Sync offline queue when coming back online
  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    
    let successCount = 0;
    let duplicateCount = 0;
    
    // Filter and ensure only unique participant IDs are processed (taking only 1 data per participant)
    const uniqueQueue: string[] = [];
    const seenPesertaIds = new Set<string>();

    offlineQueue.forEach(code => {
      const peserta = pesertaList.find(p => {
        const trimmedCode = String(code).trim().toUpperCase();
        return String(p.idPeserta || '').trim().toUpperCase() === trimmedCode || 
               String(p.kodeQr || '').trim().toUpperCase() === trimmedCode;
      });
      if (peserta) {
        if (!seenPesertaIds.has(peserta.idPeserta)) {
          seenPesertaIds.add(peserta.idPeserta);
          uniqueQueue.push(code);
        } else {
          duplicateCount++; // Count pre-existing duplicates in the queue as skipped/ignored
        }
      } else {
        uniqueQueue.push(code);
      }
    });
    
    if (onBulkScanSuccess) {
      const result = onBulkScanSuccess(uniqueQueue);
      successCount += result.successCount;
      duplicateCount += result.duplicateCount;
    } else {
      uniqueQueue.forEach(code => {
        const result = onScanSuccess(code);
        if (result.status === 'success') {
          successCount++;
        } else if (result.status === 'warn') {
          duplicateCount++;
        }
      });
    }

    const msg = `Sinkronisasi Selesai! ${successCount} Hadir Baru, ${duplicateCount} Terlewati (Duplikat).`;
    setScanResult({
      type: 'success',
      title: 'SINKRONISASI BERHASIL',
      message: msg,
      subtext: 'Semua data offline berhasil diunggah ke spreadsheet.',
      timestamp: new Date().toLocaleTimeString('id-ID')
    });
    
    setOfflineQueue([]);
    playBeep('success');
    announceVoice("Sinkronisasi data offline selesai");
  };

  return (
    <div className="space-y-6">
      {/* Database Barcode Sync Status Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              Database Barcode & QR Code
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                {pesertaList.length} Terdaftar
              </span>
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Perbaharui data barcode/QR peserta secara langsung untuk menyesuaikan dengan isian spreadsheet atau data kartu absen terbaru.
            </p>
          </div>
        </div>

        {onPullData && (
          <button
            onClick={handleRefreshBarcodeDb}
            disabled={isPulling}
            className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 dark:disabled:bg-zinc-800/50 disabled:text-zinc-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 transition-all shrink-0"
            id="btn-refresh-barcode-db"
            title="Klik untuk memperbaharui database barcode dari Google Spreadsheet"
          >
            <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
            {isPulling ? 'Memperbaharui...' : 'Perbaharui Database Barcode'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="monitoring-scanner-section">
      {/* SCANNER VIEWPORT */}
      <div className="lg:col-span-7 lg:self-start bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-100 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-start">
        {/* TAB PILIHAN METODE SCANNER */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-2">
          <button
            type="button"
            onClick={() => setScanMethod('camera')}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
              scanMethod === 'camera'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 font-bold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera HP / Laptop (Live Webcam)
          </button>
          <button
            type="button"
            onClick={() => {
              setScanMethod('hardware');
              stopScanning();
            }}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
              scanMethod === 'hardware'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 font-bold'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            id="tab-hardware-scanner-selection"
          >
            <Keyboard className="w-4 h-4" />
            Alat Scanner Fisik (USB/Wireless)
          </button>
        </div>

        {scanMethod === 'camera' ? (
          <>
            <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                Pemindai QR Code Peserta
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Posisikan QR Code di depan kamera utama handphone atau laptop Anda.
              </p>
            </div>
            
            {/* Mode Offline Status */}
            <button
              onClick={onToggleOffline}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isOffline 
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200' 
                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200'
              }`}
              id="btn-toggle-offline"
              title="Klik untuk mengubah mode online/offline"
            >
              {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {isOffline ? 'Mode Offline' : 'Mode Online (GAS/Local)'}
            </button>
          </div>

          {/* Settings Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {/* Camera Select */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Pilih Kamera
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  disabled={cameras.length === 0}
                  className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {cameras.length === 0 ? (
                    <option>Kamera tidak ditemukan / izin ditolak</option>
                  ) : (
                    cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Kamera ${cameras.indexOf(cam) + 1}`}
                      </option>
                    ))
                  )}
                </select>
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={cycleCamera}
                    className="p-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors shrink-0"
                    title="Putar / Ganti Kamera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-end gap-3 justify-between">
              <div className="flex gap-2">
                <button
                  onClick={onToggleSound}
                  className={`p-2 rounded-lg border transition-all ${
                    soundEnabled 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' 
                      : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
                  }`}
                  title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={onToggleSpeech}
                  className={`p-2 rounded-lg border transition-all ${
                    speechEnabled 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' 
                      : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
                  }`}
                  title={speechEnabled ? 'Matikan Pengumuman Suara' : 'Aktifkan Pengumuman Suara'}
                >
                  <Sparkles className={`w-4 h-4 ${speechEnabled ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {/* Batch scanning option */}
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-zinc-300"
                />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Scan Beruntun (Batch)
                </span>
              </label>
            </div>
          </div>

          {/* New Scan Mode Tabs */}
          <div className="mb-4 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl flex items-center justify-between gap-1 border border-zinc-200/50 dark:border-zinc-700/50">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wider hidden sm:inline">
              Fokus Area:
            </span>
            <div className="flex items-center gap-1 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setScanFocusMode('qr')}
                className={`flex-1 sm:flex-initial text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  scanFocusMode === 'qr'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                QR Code (Kotak)
              </button>
              <button
                type="button"
                onClick={() => setScanFocusMode('barcode')}
                className={`flex-1 sm:flex-initial text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  scanFocusMode === 'barcode'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                Barcode (Lebar)
              </button>
              <button
                type="button"
                onClick={() => setScanFocusMode('full')}
                className={`flex-1 sm:flex-initial text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  scanFocusMode === 'full'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
                title="Memindai seluruh layar kamera, sangat cocok untuk scan cepat"
              >
                Layar Penuh (Sensitif)
              </button>
            </div>
          </div>
        </div>

        {cameraError && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Akses Kamera Terhambat</p>
              <p className="opacity-95 leading-relaxed">
                Aplikasi tidak dapat mengakses kamera ({cameraError}). Jika Anda menggunakan HP/Komputer, pastikan izin kamera diizinkan untuk situs ini di pengaturan browser Anda.
              </p>
              <p className="mt-1 opacity-90 font-medium">
                💡 Tips: Anda dapat mencoba <span className="font-bold">"Buka di Tab Baru"</span> (tombol di pojok kanan atas) agar izin browser berjalan penuh, atau gunakan <span className="font-bold font-mono">Input Manual / Hardware Scanner</span> di bawah.
              </p>
            </div>
          </div>
        )}

        {/* ACTIVE CAMERA VIEWER */}
        <div className="relative aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center my-4 group">
          {/* HTML5-QRCODE TARGET VIEWPORT */}
          <div id={scannerContainerId} className="w-full h-full absolute inset-0 z-0 object-cover"></div>

          {/* Animated Overlay Frame */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              {/* Corner brackets for QR (square in center) */}
              {scanFocusMode === 'qr' && (
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
                  <span className="text-[9px] text-emerald-400 bg-black/60 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Arahkan QR Code</span>
                </div>
              )}

              {/* Corner brackets for Barcode (rectangle in center) */}
              {scanFocusMode === 'barcode' && (
                <div className="relative w-64 h-28 sm:w-72 sm:h-32 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
                  <span className="text-[9px] text-emerald-400 bg-black/60 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Arahkan Barcode</span>
                </div>
              )}

              {/* Corner brackets for Full-Frame (outer edges) */}
              {scanFocusMode === 'full' && (
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
                </div>
              )}

              {/* Laser Line */}
              <div className="w-4/5 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[bounce_3s_infinite]"></div>

              {/* Status Indicator */}
              <span className="absolute bottom-4 bg-black/75 px-3 py-1 rounded-full text-[10px] text-emerald-400 tracking-widest uppercase font-mono animate-pulse">
                KAMERA AKTIF & SCANNING...
              </span>
            </div>
          )}

          {/* Placeholder when not scanning */}
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/90 z-20">
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-emerald-950 flex items-center justify-center mb-3">
                <Camera className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>
              <p className="text-zinc-200 text-sm font-medium">Kamera Sedang Tidak Aktif</p>
              <p className="text-zinc-500 text-xs mt-1 max-w-sm">
                {!activeKegiatan 
                  ? "Pilih kegiatan terlebih dahulu di bagian atas sebelum mengaktifkan kamera." 
                  : "Tekan tombol 'Mulai Memindai' di bawah untuk mengaktifkan scanner kamera."}
              </p>
            </div>
          )}
        </div>

        {/* TRIGGER BUTTONS */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={toggleScanState}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm shadow-md transition-all duration-200 transform hover:scale-[1.01] flex items-center justify-center gap-2 ${
                isScanning
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
              id="btn-scan-trigger"
            >
              <Camera className="w-4 h-4" />
              {isScanning ? 'Hentikan Memindai (Stop)' : 'Mulai Memindai (Start)'}
            </button>
            
            <button
              onClick={() => {
                if (html5QrcodeRef.current && isScanning) {
                  startScanning(); // Quick refresh / reconnect camera
                }
              }}
              disabled={!isScanning}
              className="p-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Kamera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* ALTERNATIVE: UPLOAD & SCAN FROM IMAGE FILE */}
          <div className="border-t border-zinc-150 dark:border-zinc-800 pt-3 mt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-emerald-600" />
                Atau Pindai dari Foto / Gambar QR
              </span>
              {fileScanning && (
                <span className="text-[10px] text-emerald-600 font-bold animate-pulse">
                  Memproses Gambar...
                </span>
              )}
            </div>
            
            <label className="relative cursor-pointer bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-center transition-all flex items-center justify-center gap-2 group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                disabled={fileScanning}
                className="sr-only"
              />
              <Upload className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                {fileScanning ? 'Membaca QR...' : 'Pilih Foto QR dari Galeri / Ambil Kamera'}
              </span>
            </label>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
              *Sangat disarankan jika kamera live bermasalah. Ambil foto QR yang terfokus dan terang menggunakan aplikasi kamera bawaan HP Anda, lalu pilih di sini.*
            </p>
          </div>
        </div>
      </>
      ) : (
          <div className="space-y-6" id="hardware-scanner-panel">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                  <Barcode className="w-6 h-6 text-emerald-600 dark:text-emerald-500 animate-pulse" />
                  Mode Alat Scanner Fisik (USB / Wireless)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Memindai ID/Barcode menggunakan alat scanner genggam (barcode reader gun).
                </p>
              </div>

              {/* Mode Offline Status */}
              <button
                onClick={onToggleOffline}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isOffline 
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200' 
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200'
                }`}
                id="btn-toggle-offline-hw"
                title="Klik untuk mengubah mode online/offline"
              >
                {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                {isOffline ? 'Mode Offline' : 'Mode Online (GAS/Local)'}
              </button>
            </div>

            {/* Quick Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Kontrol Audio & Suara
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={onToggleSound}
                    className={`p-2 rounded-lg border transition-all ${
                      soundEnabled 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
                    }`}
                    title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={onToggleSpeech}
                    className={`p-2 rounded-lg border transition-all ${
                      speechEnabled 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
                    }`}
                    title={speechEnabled ? 'Matikan Pengumuman Suara' : 'Aktifkan Pengumuman Suara'}
                  >
                    <Sparkles className={`w-4 h-4 ${speechEnabled ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Fokus Scanner Otomatis
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                  <input
                    type="checkbox"
                    checked={autoFocusHardware}
                    onChange={(e) => setAutoFocusHardware(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-zinc-300"
                  />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Jaga Fokus Kursor (Hands-Free)
                  </span>
                </label>
              </div>
            </div>

            {/* LASER SCANNING TARGET ZONE */}
            <div className="relative border border-emerald-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl p-6 shadow-inner text-center flex flex-col items-center justify-center min-h-[220px]">
              {/* Pulsing indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>SIAP MENERIMA BARCODE</span>
              </div>

              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                <Barcode className="w-8 h-8 animate-pulse" />
              </div>

              <form onSubmit={handleHardwareSubmit} className="w-full max-w-sm">
                <div className="relative">
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    value={hardwareInput}
                    onChange={(e) => setHardwareInput(e.target.value.toUpperCase())}
                    placeholder={autoFocusHardware ? "Arahkan scanner lalu tembak..." : "Klik di sini, lalu tembak..."}
                    className="w-full text-center text-sm font-semibold tracking-widest font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl py-3 px-4 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-md uppercase transition-all"
                  />
                </div>
              </form>

              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-4 max-w-md">
                {autoFocusHardware ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 inline" />
                    Auto-Focus Aktif! Anda dapat langsung memindai tanpa mengeklik mouse.
                  </span>
                ) : (
                  <span>Kursor harus aktif di kotak di atas sebelum menembakkan scanner.</span>
                )}
              </p>
            </div>

            {/* TIPS DAN BANTUAN */}
            <div className="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
                💡 PETUNJUK PENGGUNAAN ALAT SCANNER FISIK:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <li><strong>Plug & Play:</strong> Cukup hubungkan kabel USB alat scanner ke laptop atau hubungkan via Bluetooth.</li>
                <li><strong>Sangat Cepat & Otomatis:</strong> Setiap scan akan otomatis disubmit, memainkan suara beep konfirmasi, dan melafalkan suara kehadiran regu sekolah.</li>
                <li><strong>Hands-Free:</strong> Pastikan opsi "Jaga Fokus Kursor" menyala agar sistem otomatis mengarahkan fokus ke kotak input jika kursor bergeser.</li>
              </ul>
            </div>
          </div>
        )}

          {/* OFFLINE QUEUE STATUS CARD */}
          {isOffline && (
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm mt-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                    Antrean Data Offline ({offlineQueue.length})
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-500/80 mt-1">
                    Anda mengaktifkan mode offline manual. Hasil scan tersimpan di antrean lokal.
                  </p>
                </div>
                <button
                  onClick={syncOfflineQueue}
                  disabled={offlineQueue.length === 0}
                  className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                >
                  Sinkronkan
                </button>
              </div>

              {offlineQueue.length > 0 ? (
                <div className="mt-3 max-h-24 overflow-y-auto space-y-1 pr-1 text-xs">
                  {offlineQueue.map((item, index) => {
                    const p = pesertaList.find(x => x.idPeserta === item);
                    return (
                      <div key={index} className="flex justify-between items-center bg-white/60 dark:bg-zinc-900/40 p-1.5 rounded border border-amber-200/30">
                        <span className="font-mono text-[11px] font-semibold">{item}</span>
                        <span className="truncate max-w-[150px] text-zinc-600 dark:text-zinc-400">{p?.namaPangkalan || 'Tak Dikenal'}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded">Antre</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-600/80 mt-2 italic">
                  Antrean kosong. Scan ID peserta akan terakumulasi di sini.
                </p>
              )}
            </div>
          )}
        </div>

      {/* RESULT & OFFLINE CONTROL PANEL */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* ACTIVE EVENT HEADER CARD */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-900">
          <p className="text-xs text-emerald-300 tracking-widest font-mono uppercase">KEGIATAN YANG SEDANG DIABSENSI</p>
          {activeKegiatan ? (
            <div className="mt-2">
              <h4 className="text-xl font-bold tracking-tight">{activeKegiatan.namaKegiatan}</h4>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-emerald-100">
                <div>
                  <span className="text-emerald-400 block font-mono">LOKASI:</span>
                  <span className="font-semibold">{activeKegiatan.lokasi}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block font-mono">WAKTU:</span>
                  <span className="font-semibold">{activeKegiatan.hari}, {formatIndonesianTime(activeKegiatan.jamMulai)} - {formatIndonesianTime(activeKegiatan.jamSelesai)} WITA</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 py-2 px-3 bg-emerald-900/50 rounded-xl border border-dashed border-emerald-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
              <p className="text-xs text-emerald-200">
                Belum ada kegiatan aktif dipilih. Pilih kegiatan pada drop-down admin untuk memulai penarikan absen.
              </p>
            </div>
          )}
        </div>

        {/* SCANNING POPUP PANEL (LARGE & PROMINENT) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm tracking-wider uppercase mb-3">
              Hasil Pemindaian Terakhir
            </h3>
            
            {scanResult.type ? (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Banner based on scan type */}
                <div className={`p-5 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                  scanResult.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400' 
                    : scanResult.type === 'warn'
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-400'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-400'
                }`}>
                  <span className="text-xs font-mono tracking-widest uppercase opacity-75 mb-1">Status Absensi</span>
                  <span className="text-3xl font-black tracking-wider mb-2">{scanResult.title}</span>
                  <span className="text-lg font-extrabold leading-snug text-red-600 dark:text-red-500 uppercase tracking-wide">
                    {scannedPeserta ? scannedPeserta.namaPangkalan : scanResult.message}
                  </span>
                  <span className="text-xs mt-1.5 opacity-80 font-bold uppercase tracking-wider">
                    {scannedPeserta ? (scannedPeserta.jenisKelamin === 'Putra' ? 'PUTRA' : 'PUTRI') : scanResult.subtext}
                  </span>
                  <span className="text-[10px] mt-3 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded font-mono">{scanResult.timestamp}</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center justify-center py-12">
                <ShieldAlert className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Belum Ada Riwayat Scan</p>
                <p className="text-[11px] mt-1 text-zinc-400 dark:text-zinc-500 max-w-xs">
                  Hasil absensi peserta (Nama, Pangkalan, Waktu) akan ditampilkan secara real-time di kotak ini setelah dipindai.
                </p>
              </div>
            )}
          </div>

          {/* MANUAL INPUT BACKUP FORM */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Alternatif: Input Manual ID Peserta
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  placeholder="Contoh: PBK001"
                  className="w-full text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={!manualId.trim()}
                className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1 transition-colors"
              >
                Kirim
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MONITORING KEHADIRAN SEKOLAH / PANGKALAN (FULL WIDTH LANDSCAPE) */}
      <div className="lg:col-span-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Monitoring Absensi Sekolah
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Status kehadiran regu Putra (Pa) & Putri (Pi)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onPushData && (
              <button
                type="button"
                onClick={handleManualSyncSpreadsheet}
                disabled={isSyncingSpreadsheet}
                className="text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                title="Kirim semua data kehadiran saat ini ke Spreadsheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSpreadsheet ? 'animate-spin' : ''}`} />
                {isSyncingSpreadsheet ? 'Menyimpan...' : 'Sinkron ke Spreadsheet'}
              </button>
            )}
            {schoolStats && (
              <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/40 text-right">
                Hadir: {schoolStats.totalPresent} / {schoolStats.totalExpected} regu
              </div>
            )}
          </div>
        </div>

        {!activeKegiatan ? (
          <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs italic">
            Pilih kegiatan aktif di bagian atas untuk melihat status kehadiran sekolah.
          </div>
        ) : (
          <>
            {/* Search Bar for Schools */}
            <div className="relative">
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => setSchoolSearchQuery(e.target.value)}
                placeholder="Cari sekolah / pangkalan..."
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-3 pr-12 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {schoolSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSchoolSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List Container grouped by tingkatan */}
            <div className="max-h-[650px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent flex flex-col gap-6">
              {filteredPangkalanList.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs col-span-full">
                  Tidak ada sekolah yang cocok dengan pencarian.
                </div>
              ) : (
                <>
                  {/* Helper renderer for pangkalan item to keep code DRY */}
                  {(() => {
                    const renderPangkalanItem = (pangkalan: string) => {
                      const pesertaPutra = pesertaList.find(p => 
                        p.namaPangkalan === pangkalan && 
                        p.jenisKelamin === 'Putra' &&
                        (!activeKegiatan.tingkatan || activeKegiatan.tingkatan.length === 0 || (p.tingkatan && activeKegiatan.tingkatan.includes(p.tingkatan)))
                      );
                      const pesertaPutri = pesertaList.find(p => 
                        p.namaPangkalan === pangkalan && 
                        p.jenisKelamin === 'Putri' &&
                        (!activeKegiatan.tingkatan || activeKegiatan.tingkatan.length === 0 || (p.tingkatan && activeKegiatan.tingkatan.includes(p.tingkatan)))
                      );

                      const hasPutra = !!pesertaPutra;
                      const hasPutri = !!pesertaPutri;
                      const isPutraActive = pesertaPutra ? pesertaPutra.statusAktif : true;
                      const isPutriActive = pesertaPutri ? pesertaPutri.statusAktif : true;

                      const isPutraPresent = kehadiranList.some(h => h.idKegiatan === activeKegiatan.idKegiatan && h.namaPangkalan === pangkalan && h.jenisKelamin === 'Putra');
                      const isPutriPresent = kehadiranList.some(h => h.idKegiatan === activeKegiatan.idKegiatan && h.namaPangkalan === pangkalan && h.jenisKelamin === 'Putri');

                      return (
                        <div key={pangkalan} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg border border-zinc-100/40 dark:border-zinc-800/20 transition-colors gap-4">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate" title={pangkalan}>
                            {pangkalan}
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            {/* PUTRA BADGE */}
                            {hasPutra ? (
                              <div
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border text-center min-w-[56px] transition-all ${
                                  !isPutraActive
                                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-500 dark:border-zinc-700/50'
                                    : isPutraPresent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                                    : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40'
                                }`}
                              >
                                Putra
                              </div>
                            ) : (
                              <div className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800/20 text-zinc-400 dark:text-zinc-600 border border-zinc-150 dark:border-zinc-800/40 text-center min-w-[56px]">
                                -
                              </div>
                            )}

                            {/* PUTRI BADGE */}
                            {hasPutri ? (
                              <div
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border text-center min-w-[56px] transition-all ${
                                  !isPutriActive
                                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-500 dark:border-zinc-700/50'
                                    : isPutriPresent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                                    : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40'
                                }`}
                              >
                                Putri
                              </div>
                            ) : (
                              <div className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800/20 text-zinc-400 dark:text-zinc-600 border border-zinc-150 dark:border-zinc-800/40 text-center min-w-[56px]">
                                -
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-5">
                        {/* SD / MI SECTION */}
                        {groupedPangkalan.sdList.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                              <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm"></span>
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Pangkalan SD / MI (Siaga / Penggalang SD)
                              </h4>
                              <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md ml-auto">
                                {groupedPangkalan.sdList.length} Sekolah
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groupedPangkalan.sdList.map(renderPangkalanItem)}
                            </div>
                          </div>
                        )}

                        {/* SMP / MTS SECTION */}
                        {groupedPangkalan.smpList.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                              <span className="w-1.5 h-3.5 bg-sky-500 rounded-sm"></span>
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                Pangkalan SMP / MTs (Penggalang SMP)
                              </h4>
                              <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md ml-auto">
                                {groupedPangkalan.smpList.length} Sekolah
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groupedPangkalan.smpList.map(renderPangkalanItem)}
                            </div>
                          </div>
                        )}

                        {/* SMA / MA / SMK SECTION */}
                        {groupedPangkalan.smaList.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                              <span className="w-1.5 h-3.5 bg-rose-500 rounded-sm"></span>
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                Pangkalan SMA / MA / SMK (Penegak)
                              </h4>
                              <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md ml-auto">
                                {groupedPangkalan.smaList.length} Sekolah
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groupedPangkalan.smaList.map(renderPangkalanItem)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
