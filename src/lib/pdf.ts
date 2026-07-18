import { jsPDF } from 'jspdf';
import { Peserta, Kehadiran, AnggotaPramuka, Kegiatan, AppSettings, formatIndonesianDate, formatIndonesianTime } from '../types';

// Helper to load image as base64 and convert transparent parts to a white JPEG format (which is 100% supported in jsPDF)
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const tryDirect = () => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill canvas with white background first so transparency in PNG doesn't become black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataURL);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = imageUrl;
    });
  };

  const tryProxy = (targetUrl: string) => {
    return new Promise<string>((resolve, reject) => {
      // Use images.weserv.nl to proxy the image, convert transparency to white, and output as JPEG
      const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&output=jpg&bg=white`;
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataURL);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = proxiedUrl;
    });
  };

  try {
    return await tryDirect();
  } catch (err) {
    console.warn("getBase64ImageFromUrl direct load failed, trying proxy...", err);
    try {
      return await tryProxy(imageUrl);
    } catch (proxyErr) {
      console.error("getBase64ImageFromUrl proxy also failed:", proxyErr);
      throw proxyErr;
    }
  }
}

interface LoadedImage {
  data: string;
  width: number;
  height: number;
}

async function loadLogoImage(url: string): Promise<LoadedImage> {
  // If the url is already a base64 data url, load it directly
  if (url.startsWith('data:')) {
    return new Promise<LoadedImage>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ data: url, width: img.width, height: img.height });
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }

  // Try direct loading with CORS enabled
  const tryDirect = () => {
    return new Promise<LoadedImage>((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill canvas with white background first so transparency in PNG doesn't become black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            const data = canvas.toDataURL('image/jpeg', 0.95);
            resolve({ data, width: img.width, height: img.height });
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = url;
    });
  };

  // Try loading via images.weserv.nl CORS proxy
  const tryProxy = (targetUrl: string) => {
    return new Promise<LoadedImage>((resolve, reject) => {
      // images.weserv.nl can proxy and convert the image to JPEG with a white background directly
      const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&output=jpg&bg=white`;
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          try {
            const data = canvas.toDataURL('image/jpeg', 0.95);
            resolve({ data, width: img.width, height: img.height });
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error("Canvas context is null"));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = proxiedUrl;
    });
  };

  try {
    return await tryDirect();
  } catch (directError) {
    console.warn("Direct loading with CORS failed, trying proxy loading...", directError);
    try {
      return await tryProxy(url);
    } catch (proxyError) {
      console.error("Proxy loading also failed:", proxyError);
      throw proxyError;
    }
  }
}

async function drawLogoInCorner(
  doc: jsPDF,
  logoUrl: string | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number
): Promise<void> {
  if (!logoUrl || logoUrl.trim() === "") return;
  try {
    const img = await loadLogoImage(logoUrl);
    if (!img || !img.data) return;
    const ratio = img.width / img.height || 1;
    let w = maxW;
    let h = maxW / ratio;
    if (h > maxH) {
      h = maxH;
      w = maxH * ratio;
    }
    try {
      doc.addImage(img.data, 'JPEG', x, y, w, h);
    } catch (addImageError) {
      console.warn("Gagal merender logo kegiatan ke dalam kartu:", addImageError);
    }
  } catch (error) {
    console.error("Gagal menggambar logo kegiatan:", error);
  }
}

/**
 * Generates and downloads a high-fidelity pocket-sized ID Card (A6) PDF for a Participant.
 */
export async function generateKartuAbsenPDF(peserta: Peserta, settings?: AppSettings): Promise<void> {
  const eventName = settings?.namaEvent || "Kemah Bakti & Lomba Pramuka Kwartir Bulukumpa";
  const eventLocation = settings?.lokasiEvent || "Bumi Perkemahan Bulukumpa";
  const eventOrganizer = settings?.pelaksanaEvent || "Kwartir Ranting Gerakan Pramuka Bulukumpa";

  // Determine card-specific color nuance (Cokelat/Brown for Pembina, Hijau for Penggalang SD, Biru for Penggalang SMP, Orange for Penegak SMA)
  let palette = {
    primary: [6, 95, 70],      // Default Emerald Green (Penggalang SD)
    bgLight: [236, 253, 245],   // Light Green
    labelDark: [6, 78, 59]      // Dark Green
  };

  if (peserta.tingkatan) {
    const upTingkatan = peserta.tingkatan.toUpperCase();
    if (upTingkatan.includes('SMP')) {
      palette = {
        primary: [30, 64, 175],   // Biru (Royal Blue / Blue-800)
        bgLight: [239, 246, 255],  // Light Blue-50 tint
        labelDark: [30, 58, 138]   // Dark Blue text
      };
    } else if (upTingkatan.includes('SMA') || upTingkatan.includes('SMK') || upTingkatan.includes('MA') || upTingkatan.includes('PENEGAK')) {
      palette = {
        primary: [194, 65, 12],   // Orange (Orange-700)
        bgLight: [254, 243, 232],  // Light Orange-50 tint
        labelDark: [154, 52, 18]   // Dark Orange text
      };
    } else {
      palette = {
        primary: [6, 95, 70],     // Hijau (Emerald Green)
        bgLight: [236, 253, 245],  // Light Green-50 tint
        labelDark: [6, 78, 59]     // Dark Green text
      };
    }
  }

  // A6: 105mm width, 148mm height
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6'
  });

  const w = 105;
  const h = 148;

  // 1. Draw outer background/card frame (A6 canvas with 5mm margin)
  doc.setDrawColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.setLineWidth(2.2);
  doc.roundedRect(5, 5, w - 10, h - 10, 6, 6, 'D');

  // 2. Draw Top Banner Block (Solid primary color background)
  doc.setFillColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.roundedRect(8, 8, w - 16, 19, 3, 3, 'F');

  // Draw Logo in a dedicated White rounded block (so transparent or white-background logos look pristine)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 9.5, 15, 16, 1.5, 1.5, 'F');

  if (settings?.logoUrl) {
    await drawLogoInCorner(doc, settings.logoUrl, 11, 10.5, 13, 14);
  }

  // Text inside Top Banner Block (Elegant white text on primary color background)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(eventName.toUpperCase(), 62, 14.5, { align: 'center', maxWidth: 64 });
  doc.setFontSize(7.5);
  doc.text(eventOrganizer.toUpperCase(), 62, 21.5, { align: 'center', maxWidth: 64 });

  // 3. Card Subtitle Label (e.g., KARTU ABSENSI PRAMUKA)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.text('KARTU ABSENSI PRAMUKA', w / 2, 33, { align: 'center' });

  // Pangkalan Name (Large, bold, colored based on palette)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  
  const pangkalanLines = doc.splitTextToSize(peserta.namaPangkalan.toUpperCase(), w - 20);
  let pangkalanY = 39;
  pangkalanLines.forEach((line: string) => {
    doc.text(line, w / 2, pangkalanY, { align: 'center' });
    pangkalanY += 4.5;
  });

  // Under Pangkalan Name: Tuliskan Putra atau Putri
  const jkY = pangkalanY + 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (peserta.jenisKelamin === 'Putri') {
    doc.setTextColor(190, 24, 74); // Rose/pinkish tone for Putri
    doc.text('PUTRI', w / 2, jkY, { align: 'center' });
  } else {
    doc.setTextColor(30, 64, 175); // Blue tone for Putra
    doc.text('PUTRA', w / 2, jkY, { align: 'center' });
  }

  // Tiny separator line
  const sepY = jkY + 2.5;
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.35);
  doc.line(15, sepY, w - 15, sepY);

  // 4. Centered QR Code Box (Dashed border style matching photo box)
  const qrBoxW = 42;
  const qrBoxH = 42;
  const qrBoxX = (w - qrBoxW) / 2;
  const qrBoxY = sepY + 2.5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([2, 1], 0);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 2, 2, 'FD');
  doc.setLineDashPattern([], 0); // Reset dash

  // Load and Add QR Code Image
  const qrCodeToUse = peserta.kodeQr || peserta.idPeserta;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeToUse)}`;
  try {
    const base64Img = await getBase64ImageFromUrl(qrUrl);
    doc.addImage(base64Img, 'JPEG', qrBoxX + 2.5, qrBoxY + 2.5, qrBoxW - 5, qrBoxH - 5);
  } catch (error) {
    console.error("Gagal memuat QR Code ke PDF, menggambar placeholder:", error);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('[QR Code]', w / 2, qrBoxY + (qrBoxH / 2) + 2, { align: 'center' });
  }

  // 5. User Info Box (Contains ID Regu/Peserta)
  const infoY = 113;
  const infoH = 24;

  doc.setFillColor(palette.bgLight[0], palette.bgLight[1], palette.bgLight[2]);
  doc.roundedRect(10, infoY, w - 20, infoH, 3.5, 3.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(palette.labelDark[0], palette.labelDark[1], palette.labelDark[2]);
  doc.text('ID REGU / KODE ABSENSI', w / 2, infoY + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  // Auto scale text size if it's too long
  const displayCode = String(qrCodeToUse);
  const codeFontSize = displayCode.length > 12 ? 10 : 13;
  doc.setFontSize(codeFontSize);
  doc.setTextColor(17, 24, 39);
  doc.text(displayCode, w / 2, infoY + 16, { align: 'center' });

  // 6. Footer Terms Notice
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  const footerText = 'Gunakan kode QR ini untuk melakukan scan absensi kehadiran.';
  doc.text(footerText, w / 2, 142, { align: 'center' });

  // Save the PDF
  doc.save(`Kartu_Absen_${peserta.namaPangkalan.replace(/\s+/g, '_')}_${peserta.idPeserta}.pdf`);
}

/**
 * Generates and downloads a clean, professional multi-page A4 PDF report of attendance.
 */
export async function generateLaporanPDF(
  data: Kehadiran[],
  filters: { kegiatan: string; pangkalan: string; kategori: string; tingkatan?: string },
  settings?: AppSettings
): Promise<void> {
  const eventName = settings?.namaEvent || "Kemah Bakti & Lomba Pramuka Kwartir Bulukumpa";
  const eventLocation = settings?.lokasiEvent || "Bumi Perkemahan Bulukumpa";
  const eventOrganizer = settings?.pelaksanaEvent || "Kwartir Ranting Gerakan Pramuka Bulukumpa";

  let logoImg: LoadedImage | null = null;
  if (settings?.logoUrl && settings.logoUrl.trim() !== "") {
    try {
      logoImg = await loadLogoImage(settings.logoUrl);
    } catch (e) {
      console.error("Gagal memuat logo kegiatan:", e);
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const w = 210;
  const h = 297;

  // Reusable header function
  const drawHeader = (pageNumber: number) => {
    // If logo is available, draw it in top-left
    if (logoImg && logoImg.data) {
      try {
        const ratio = logoImg.width / logoImg.height || 1;
        let logoW = 15;
        let logoH = 15 / ratio;
        if (logoH > 15) {
          logoH = 15;
          logoW = 15 * ratio;
        }
        doc.addImage(logoImg.data, 'JPEG', 12, 13, logoW, logoH);
      } catch (addImageError) {
        console.warn("Gagal merender logo ke header laporan PDF:", addImageError);
      }
    }

    // Elegant emerald/gold line decoration at top
    doc.setDrawColor(6, 95, 70); // Emerald Green
    doc.setLineWidth(1);
    doc.line(12, 10, w - 12, 10);
    doc.setLineWidth(0.3);
    doc.line(12, 11.5, w - 12, 11.5);

    // Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('LAPORAN KEHADIRAN & REKAP ABSENSI', w / 2, 19, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(eventName.toUpperCase(), w / 2, 24, { align: 'center', maxWidth: w - 24 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' });
    doc.text(`Pelaksana: ${eventOrganizer} | Lokasi: ${eventLocation} | Dicetak pada: ${printedAt} WITA`, w / 2, 28.5, { align: 'center', maxWidth: w - 24 });

    // Page number
    doc.text(`Halaman ${pageNumber}`, w - 12, 28.5, { align: 'right' });

    // Line below header
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.line(12, 31, w - 12, 31);
  };

  let pageNum = 1;
  drawHeader(pageNum);

  // 1. Draw Filter & Summary Box (Only on page 1)
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(12, 34, w - 24, 21, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);

  doc.text(`Filter Kegiatan: ${filters.kegiatan}`, 16, 39);
  doc.text(`Filter Pangkalan: ${filters.pangkalan}`, 16, 45);
  doc.text(`Kategori Regu: ${filters.kategori}`, 105, 39);
  doc.text(`Tingkatan: ${filters.tingkatan || 'Semua'}`, 105, 45);
  doc.text(`Total Kehadiran: ${data.length} Absensi`, 16, 51);

  // 2. Table Render Settings
  let y = 60;
  const colX = [12, 44, 118, 134, 182];
  const colW = [32, 74, 16, 48, 16];
  const headers = ['Waktu Log', 'Pangkalan', 'Kategori', 'Kegiatan', 'Status'];

  const drawTableHeader = (currentY: number) => {
    doc.setFillColor(6, 95, 70); // Emerald Green
    doc.roundedRect(12, currentY, w - 24, 7, 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    headers.forEach((h, index) => {
      if (index === 4) {
        doc.text(h, colX[index] + colW[index] / 2, currentY + 4.8, { align: 'center' });
      } else {
        doc.text(h, colX[index] + 2, currentY + 4.8);
      }
    });
  };

  drawTableHeader(y);
  y += 7;

  // 3. Render Table Rows
  doc.setFontSize(7.5);
  doc.setTextColor(31, 41, 55);

  if (data.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 163, 175);
    doc.text('Tidak ada riwayat log absensi sesuai filter...', w / 2, y + 10, { align: 'center' });
    y += 18;
  } else {
    data.forEach((log, i) => {
      // Calculate heights based on split text
      doc.setFontSize(7.5);
      const kegiatanLines = doc.splitTextToSize(log.namaKegiatan, colW[3] - 3);
      const maxLines = Math.max(kegiatanLines.length, 1);

      // Height of this specific row
      const rowHeight = maxLines > 1 ? 4.5 + maxLines * 2.8 : 6.5;

      // Check if we need to paginate
      if (y + rowHeight > 265) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        y = 35; // Position on new page
        drawTableHeader(y);
        y += 7;
        doc.setFontSize(7.5);
        doc.setTextColor(31, 41, 55);
      }

      // Draw subtle row background for alternating rows
      if (i % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(12, y, w - 24, rowHeight, 'F');
      }

      // Draw horizontal line separator
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(12, y + rowHeight, w - 12, y + rowHeight);

      // Write text columns
      doc.setFont('helvetica', 'normal');
      const cleanTanggal = log.tanggal && log.tanggal.includes('T') 
        ? log.tanggal.split('T')[0] 
        : log.tanggal;
      let displayTanggal = cleanTanggal;
      if (cleanTanggal && /^\d{4}-\d{2}-\d{2}$/.test(cleanTanggal)) {
        const parts = cleanTanggal.split('-');
        displayTanggal = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const formattedTime = formatIndonesianTime(log.jam);
      doc.text(`${displayTanggal} - ${formattedTime}`, colX[0] + 2, y + 4.5);
      
      doc.setFont('helvetica', 'bold');
      doc.text(log.namaPangkalan, colX[1] + 2, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.text(log.jenisKelamin === 'Putra' ? 'Putra' : 'Putri', colX[2] + 2, y + 4.5);
      
      doc.setFont('helvetica', 'semibold');
      doc.text(kegiatanLines, colX[3] + 2, y + 4.5);
      
      doc.setFont('helvetica', 'bold');
      if (log.statusHadir === 'Tidak Hadir') {
        doc.setTextColor(220, 38, 38); // red-600
        doc.text('Tidak Hadir', colX[4] + colW[4] / 2, y + 4.5, { align: 'center' });
      } else {
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text('Hadir', colX[4] + colW[4] / 2, y + 4.5, { align: 'center' });
      }
      
      doc.setTextColor(31, 41, 55); // Reset text color
      doc.setFont('helvetica', 'normal');

      y += rowHeight;
    });
  }

  // 4. Signatures (Mengetahui)
  if (y > 230) {
    doc.addPage();
    pageNum++;
    drawHeader(pageNum);
    y = 35;
  }

  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);

  // Left Signature
  const chairmanName = settings?.namaKetua || "............................................";
  const secretaryName = settings?.namaSekretaris || "............................................";

  doc.text('Mengetahui,', 30, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Panitia Pelaksana', 30, y + 4.5);
  doc.text(chairmanName, 30, y + 25);
  doc.line(30, y + 26, 85, y + 26); // underline for name
  // Left Signature bottom label removed

  // Right Signature
  const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Bulukumpa, ${formattedDate}`, w - 80, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Sekretaris Panitia', w - 80, y + 4.5);
  doc.text(secretaryName, w - 80, y + 25);
  doc.line(w - 80, y + 26, w - 25, y + 26); // underline for name

  // 5. Finalize document
  doc.save(`Laporan_Absensi_Kwartir_Bulukumpa_${filters.kegiatan.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generates an A4 PDF consisting of 4 ID Cards per page for both Pembina and Peserta (members).
 */
export async function generateBulkIdCardsPDF(
  pangkalanName: string,
  idPeserta: string, // Pangkalan code e.g. PKG-123
  pembina: { nama: string; hp: string } | null,
  anggotaList: AnggotaPramuka[],
  jenisKelamin: 'Putra' | 'Putri',
  settings?: AppSettings,
  tingkatan?: string
): Promise<void> {
  const eventName = settings?.namaEvent || "Kemah Bakti & Lomba Pramuka Kwartir Bulukumpa";
  const eventLocation = settings?.lokasiEvent || "Bumi Perkemahan Bulukumpa";
  const eventOrganizer = settings?.pelaksanaEvent || "Kwartir Ranting Gerakan Pramuka Bulukumpa";

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const w = 210;
  const h = 297;

  // Build a list of all cards to render
  const cards: Array<{
    type: 'Pembina' | 'Peserta';
    nama: string;
    subValue1: string; // Phone for Pembina, Tempat Lahir for Peserta
    subValue2: string; // Empty for Pembina, Tanggal Lahir for Peserta
  }> = [];

  // Add Pembina if exists
  if (pembina && pembina.nama.trim() !== '') {
    cards.push({
      type: 'Pembina',
      nama: pembina.nama,
      subValue1: pembina.hp || '-',
      subValue2: 'Pembina Pendamping'
    });
  }

  // Add all members
  anggotaList.forEach((ang) => {
    cards.push({
      type: 'Peserta',
      nama: ang.nama,
      subValue1: ang.tempatLahir,
      subValue2: ang.tanggalLahir
    });
  });

  if (cards.length === 0) {
    throw new Error("Tidak ada data Pembina atau Anggota Pramuka untuk dicetak!");
  }

  // Render each card in a 2x2 grid on A4
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // Determine card-specific color nuance (Cokelat/Brown for Pembina, Hijau for Penggalang SD, Biru for Penggalang SMP, Orange for Penegak SMA)
    let palette = {
      primary: [6, 95, 70],      // Default Emerald Green for Peserta (Penggalang SD)
      bgLight: [236, 253, 245],   // Light Emerald Green-50 tint
      labelDark: [6, 78, 59]      // Dark Emerald Green text
    };

    if (card.type === 'Pembina') {
      palette = {
        primary: [110, 68, 30],   // Cokelat (Scout/Chocolate Brown)
        bgLight: [248, 240, 232],  // Light Cokelat tint
        labelDark: [110, 68, 30]
      };
    } else if (tingkatan) {
      const upTingkatan = tingkatan.toUpperCase();
      if (upTingkatan.includes('SMP')) {
        palette = {
          primary: [30, 64, 175],   // Biru (Royal Blue / Blue-800)
          bgLight: [239, 246, 255],  // Light Blue-50 tint
          labelDark: [30, 58, 138]   // Dark Blue text
        };
      } else if (upTingkatan.includes('SMA') || upTingkatan.includes('SMK') || upTingkatan.includes('MA') || upTingkatan.includes('PENEGAK')) {
        palette = {
          primary: [194, 65, 12],   // Orange (Orange-700)
          bgLight: [254, 243, 232],  // Light Orange-50 tint
          labelDark: [154, 52, 18]   // Dark Orange text
        };
      } else {
        // Defaults to Hijau for Penggalang SD (SD/MI)
        palette = {
          primary: [6, 95, 70],     // Hijau (Emerald Green)
          bgLight: [236, 253, 245],  // Light Green-50 tint
          labelDark: [6, 78, 59]     // Dark Green text
        };
      }
    }

    const pageNum = Math.floor(i / 4);
    const pos = i % 4; // 0, 1, 2, 3 inside the page

    // If we've advanced to a new page, add a page
    if (pos === 0 && pageNum > 0) {
      doc.addPage();
    }

    // Grid coordinates
    const col = pos % 2; // 0 or 1
    const row = Math.floor(pos / 2); // 0 or 1

    const cardX = 10 + col * 100; // Col 0 is 10mm, Col 1 is 110mm
    const cardY = 15 + row * 135; // Row 0 is 15mm, Row 1 is 150mm
    const cardW = 90;
    const cardH = 125;

    // 1. Card container background with subtle gray/gold shadow border
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.4);
    doc.setFillColor(252, 253, 252);
    doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'FD');

    // Solid inner border with color according to dynamic nuance palette (thickened for elegant framing)
    doc.setDrawColor(palette.primary[0], palette.primary[1], palette.primary[2]);
    doc.setLineWidth(2.2);
    doc.roundedRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 4, 4, 'D');

    // 2. Header Banner Block (Solid primary color background)
    doc.setFillColor(palette.primary[0], palette.primary[1], palette.primary[2]);
    doc.roundedRect(cardX + 4, cardY + 4, cardW - 8, 18, 3, 3, 'F');

    // Draw Logo inside a dedicated White rounded block to seamlessly blend white-background logos
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX + 5.5, cardY + 5, 14, 16, 1.5, 1.5, 'F');

    // Draw Logo in Top Left Corner of Card proportionately
    if (settings?.logoUrl) {
      await drawLogoInCorner(doc, settings.logoUrl, cardX + 6.5, cardY + 6, 12, 14);
    }

    // Header Title (Elegant white text on primary color background)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(eventName.toUpperCase(), cardX + 54, cardY + 11, { align: 'center', maxWidth: 60 });
    doc.setFontSize(7.5);
    doc.text(eventOrganizer.toUpperCase(), cardX + 54, cardY + 16, { align: 'center', maxWidth: 60 });

    // 3. Card Subtitle Label (e.g., PEMBINA PENDAMPING vs PESERTA PERKEMAHAN)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
    if (card.type === 'Pembina') {
      doc.text('PEMBINA PENDAMPING', cardX + (cardW / 2), cardY + 28.5, { align: 'center' });
    } else {
      doc.text('KARTU PESERTA PERKEMAHAN', cardX + (cardW / 2), cardY + 28.5, { align: 'center' });
    }

    // 4. School/Pangkalan name (Standout & Highlighted with color and bigger font)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5); // Prominent size to emphasize School Name
    doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
    
    const pangkalanLines = doc.splitTextToSize(pangkalanName.toUpperCase(), cardW - 12);
    let pangkalanY = cardY + 34.5;
    pangkalanLines.forEach((line: string) => {
      doc.text(line, cardX + (cardW / 2), pangkalanY, { align: 'center' });
      pangkalanY += 4.2;
    });

    // Under Pangkalan Name: Tuliskan Putra atau Putri
    const jkY = pangkalanY + 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    if (jenisKelamin === 'Putri') {
      doc.setTextColor(190, 24, 74); // Rose/pinkish tone for Putri
      doc.text('PUTRI', cardX + (cardW / 2), jkY, { align: 'center' });
    } else {
      doc.setTextColor(30, 64, 175); // Blue tone for Putra
      doc.text('PUTRA', cardX + (cardW / 2), jkY, { align: 'center' });
    }

    // Tiny separator line positioned dynamically
    const sepY = jkY + 2.5;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.35);
    doc.line(cardX + 15, sepY, cardX + cardW - 15, sepY);

    // 5. Centered 3x4 Photo Placeholder Box (30mm x 40mm) positioned dynamically
    const photoW = 30;
    const photoH = 40;
    const photoX = cardX + (cardW - photoW) / 2;
    const photoY = sepY + 2.5;

    // Light-filled background for photo area
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.35);
    
    // Draw dashed border for photo area to denote a place to paste a photo
    doc.setLineDashPattern([2, 1], 0);
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'FD');
    doc.setLineDashPattern([], 0); // Reset to solid lines

    // Text instructions inside the photo box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('TEMPEL FOTO', cardX + (cardW / 2), photoY + 21.5, { align: 'center' });

    // 6. User Info Box placed closer to the bottom (Contains Nama Lengkap)
    const infoY = cardY + 91;
    const infoH = 26;
    
    // Determine dynamic font size based on name length to emphasize short names and gracefully scale long ones
    let nameFontSize = 10.5;
    const nameLen = card.nama.trim().length;
    if (nameLen <= 14) {
      nameFontSize = 13.5; // Standout/large for short names
    } else if (nameLen <= 22) {
      nameFontSize = 11; // Medium large
    } else if (nameLen <= 32) {
      nameFontSize = 9.2; // Smaller to fit on one or two lines
    } else {
      nameFontSize = 8; // Extra compact for very long names
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameFontSize);
    const nameLines = doc.splitTextToSize(card.nama.toUpperCase(), cardW - 18);
    
    // Safeguard: If name length split into more than 2 lines, shrink slightly
    if (nameLines.length > 2) {
      nameFontSize = Math.max(7.5, nameFontSize - 1);
      doc.setFontSize(nameFontSize);
      nameLines.splice(0, nameLines.length, ...doc.splitTextToSize(card.nama.toUpperCase(), cardW - 18));
    }
    
    // Colored background tint based on card type and nuance palette
    doc.setFillColor(palette.bgLight[0], palette.bgLight[1], palette.bgLight[2]);
    doc.roundedRect(cardX + 6, infoY, cardW - 12, infoH, 3.5, 3.5, 'F');

    // Label inside the box - positioned dynamically to reduce spacing (dekatkan)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(palette.labelDark[0], palette.labelDark[1], palette.labelDark[2]);
    
    let labelY = infoY + 8;
    let currentY = infoY + 16.5;
    
    if (nameLines.length === 2) {
      labelY = infoY + 7.5;
      currentY = infoY + 15;
    } else if (nameLines.length > 2) {
      labelY = infoY + 6.5;
      currentY = infoY + 13;
    }
    
    doc.text('NAMA LENGKAP', cardX + (cardW / 2), labelY, { align: 'center' });
    
    // Actual name value with dynamic size
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameFontSize);
    doc.setTextColor(17, 24, 39);

    nameLines.forEach((line: string) => {
      doc.text(line, cardX + (cardW / 2), currentY, { align: 'center' });
      currentY += (nameFontSize * 0.45); // Decreased spacing to bring names closer together
    });

    // Tiny card index marker for page alignment
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text(`Card ${i + 1}/${cards.length}`, cardX + cardW - 8, cardY + cardH - 3.5, { align: 'right' });
  }

  // Save the complete document
  doc.save(`ID_Cards_${pangkalanName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generates and downloads a clean, professional A4 PDF report of the Camping Schedule.
 */
export async function generateJadwalKegiatanPDF(
  data: Kegiatan[],
  filterLevel: string,
  settings?: AppSettings
): Promise<void> {
  const eventName = settings?.namaEvent || "Kemah Bakti & Lomba Pramuka Kwartir Bulukumpa";
  const eventLocation = settings?.lokasiEvent || "Bumi Perkemahan Bulukumpa";
  const eventOrganizer = settings?.pelaksanaEvent || "Kwartir Ranting Gerakan Pramuka Bulukumpa";

  let logoImg: LoadedImage | null = null;
  if (settings?.logoUrl && settings.logoUrl.trim() !== "") {
    try {
      logoImg = await loadLogoImage(settings.logoUrl);
    } catch (e) {
      console.error("Gagal memuat logo kegiatan:", e);
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const w = 210;
  const h = 297;

  // Reusable header function
  const drawHeader = (pageNumber: number) => {
    // If logo is available, draw it in top-left
    if (logoImg && logoImg.data) {
      try {
        const ratio = logoImg.width / logoImg.height || 1;
        let logoW = 15;
        let logoH = 15 / ratio;
        if (logoH > 15) {
          logoH = 15;
          logoW = 15 * ratio;
        }
        doc.addImage(logoImg.data, 'JPEG', 12, 13, logoW, logoH);
      } catch (addImageError) {
        console.warn("Gagal merender logo ke header jadwal PDF:", addImageError);
      }
    }

    // Elegant emerald/gold line decoration at top
    doc.setDrawColor(6, 95, 70); // Emerald Green
    doc.setLineWidth(1);
    doc.line(12, 10, w - 12, 10);
    doc.setLineWidth(0.3);
    doc.line(12, 11.5, w - 12, 11.5);

    // Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('JADWAL AGENDA & RUNDOWN PERKEMAHAN', w / 2, 19, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(eventName.toUpperCase(), w / 2, 24, { align: 'center', maxWidth: w - 24 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' });
    doc.text(`Pelaksana: ${eventOrganizer} | Lokasi: ${eventLocation} | Dicetak pada: ${printedAt} WITA`, w / 2, 28.5, { align: 'center', maxWidth: w - 24 });

    // Page number
    doc.text(`Halaman ${pageNumber}`, w - 12, 28.5, { align: 'right' });

    // Line below header
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.line(12, 31, w - 12, 31);
  };

  let pageNum = 1;
  drawHeader(pageNum);

  // 1. Summary Box
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(12, 34, w - 24, 15, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);

  doc.text(`Tingkatan / Sasaran: ${filterLevel === 'Semua' ? 'Semua Tingkatan' : filterLevel}`, 16, 40);
  doc.text(`Jumlah Agenda / Kegiatan: ${data.length} Kegiatan`, 16, 45);

  // 2. Table Header
  let y = 55;
  const colX = [12, 25, 60, 90, 140, 180];
  const colW = [13, 35, 30, 50, 40, 18];
  const headers = ['No.', 'Hari, Tanggal', 'Waktu (WITA)', 'Nama Kegiatan', 'Sasaran Tingkatan', 'Lokasi'];

  const drawTableHeader = (currentY: number) => {
    doc.setFillColor(6, 95, 70); // Emerald Green
    doc.roundedRect(12, currentY, w - 24, 8, 1, 1, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    headers.forEach((hdr, index) => {
      doc.text(hdr, colX[index] + 2, currentY + 5.5);
    });
  };

  drawTableHeader(y);
  y += 8;

  // 3. Render rows
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);

  if (data.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 163, 175);
    doc.text('Tidak ada jadwal agenda kegiatan perkemahan...', w / 2, y + 10, { align: 'center' });
    y += 18;
  } else {
    data.forEach((keg, i) => {
      // Format text for columns
      const textNo = `#${keg.urutan}`;
      const textHariTanggal = `${keg.hari}, ${formatIndonesianDate(keg.tanggal)}`;
      const textWaktu = `${keg.jamMulai || ''} - ${keg.jamSelesai || ''}`;
      const textNama = keg.namaKegiatan;
      const textTarget = keg.tingkatan && keg.tingkatan.length > 0 
        ? keg.tingkatan.map(t => {
            if (t === 'Penggalang SD (SD/MI)') return 'Penggalang SD/MI';
            if (t === 'Penggalang SMP (SMP/MTs)') return 'Penggalang SMP/MTs';
            if (t === 'Penegak (SMA/MA/SMK)') return 'Penegak SMA/MA/SMK';
            return t;
          }).join(', ')
        : 'Semua';
      const textLokasi = keg.lokasi || '-';

      // Set font settings to split properly
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      // Split text into lines to compute column heights
      const linesCol0 = doc.splitTextToSize(textNo, colW[0] - 4);
      const linesCol1 = doc.splitTextToSize(textHariTanggal, colW[1] - 4);
      const linesCol2 = doc.splitTextToSize(textWaktu, colW[2] - 4);
      const linesCol3 = doc.splitTextToSize(textNama, colW[3] - 4);
      const linesCol4 = doc.splitTextToSize(textTarget, colW[4] - 4);
      const linesCol5 = doc.splitTextToSize(textLokasi, colW[5] - 4);

      const maxLines = Math.max(
        1,
        linesCol0.length,
        linesCol1.length,
        linesCol2.length,
        linesCol3.length,
        linesCol4.length,
        linesCol5.length
      );

      const lineSpacing = 3.8;
      const rowHeight = Math.max(8, 4 + maxLines * lineSpacing);

      // Check if we need to paginate before drawing
      if (y + rowHeight > 275) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        y = 35; // Position on new page
        drawTableHeader(y);
        y += 8;
        doc.setFontSize(8);
        doc.setTextColor(31, 41, 55);
      }

      // Alternating row backgrounds
      if (i % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(12, y, w - 24, rowHeight, 'F');
      }

      // Draw horizontal separator line at bottom of the row
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(12, y + rowHeight, w - 12, y + rowHeight);

      // Render cells line by line
      const startTextY = y + 5.0;

      // Col 0: No
      doc.setFont('helvetica', 'bold');
      linesCol0.forEach((line: string, idx: number) => {
        doc.text(line, colX[0] + 2, startTextY + idx * lineSpacing);
      });

      // Col 1: Hari, Tanggal
      doc.setFont('helvetica', 'normal');
      linesCol1.forEach((line: string, idx: number) => {
        doc.text(line, colX[1] + 2, startTextY + idx * lineSpacing);
      });

      // Col 2: Waktu
      doc.setFont('helvetica', 'semibold');
      linesCol2.forEach((line: string, idx: number) => {
        doc.text(line, colX[2] + 2, startTextY + idx * lineSpacing);
      });

      // Col 3: Nama Kegiatan
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 95, 70); // Emerald accent for name
      linesCol3.forEach((line: string, idx: number) => {
        doc.text(line, colX[3] + 2, startTextY + idx * lineSpacing);
      });
      doc.setTextColor(31, 41, 55); // Reset

      // Col 4: Sasaran Tingkatan
      doc.setFont('helvetica', 'normal');
      linesCol4.forEach((line: string, idx: number) => {
        doc.text(line, colX[4] + 2, startTextY + idx * lineSpacing);
      });

      // Col 5: Lokasi
      linesCol5.forEach((line: string, idx: number) => {
        doc.text(line, colX[5] + 2, startTextY + idx * lineSpacing);
      });

      y += rowHeight;
    });
  }

  // Signatures
  if (y > 230) {
    doc.addPage();
    pageNum++;
    drawHeader(pageNum);
    y = 35;
  }

  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);

  // Left Signature
  const chairmanName = settings?.namaKetua || "............................................";
  const secretaryName = settings?.namaSekretaris || "............................................";

  doc.text('Mengetahui,', 30, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Panitia Pelaksana', 30, y + 4.5);
  doc.text(chairmanName, 30, y + 25);
  doc.line(30, y + 26, 85, y + 26); // underline for name

  // Right Signature
  const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Bulukumpa, ${formattedDate}`, w - 80, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Sekretaris Panitia', w - 80, y + 4.5);
  doc.text(secretaryName, w - 80, y + 25);
  doc.line(w - 80, y + 26, w - 25, y + 26); // underline for name

  doc.save(`Jadwal_Kegiatan_Bulukumpa_${filterLevel.replace(/\s+/g, '_')}.pdf`);
}
