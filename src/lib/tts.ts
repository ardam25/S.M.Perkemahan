/**
 * Utility for Text-to-Speech (TTS) with a focus on Indonesian Adult Female voice.
 */

export function getIndonesianFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  
  // Filter for Indonesian voices
  const idVoices = voices.filter(v => {
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

  if (idVoices.length === 0) return null;

  // Keywords representing Indonesian adult female voices
  // 'gadis' -> Microsoft Gadis (Windows Indonesian Female)
  // 'damayanti' -> Apple Damayanti (macOS/iOS Indonesian Female)
  // 'google' -> Google Bahasa Indonesia (Android/Chrome Indonesian Female)
  const femaleKeywords = ['gadis', 'damayanti', 'google', 'female', 'perempuan', 'wanita', 'siri', 'yasmin', 'mellina'];
  
  // 1. Try to find an online/natural female voice (highest quality)
  const onlineFemale = idVoices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes('online') && femaleKeywords.some(kw => name.includes(kw)) && !name.includes('ardi');
  });
  if (onlineFemale) return onlineFemale;

  // 2. Try to find the best matching female voice
  const bestFemaleVoice = idVoices.find(v => {
    const name = v.name.toLowerCase();
    return femaleKeywords.some(keyword => name.includes(keyword)) && !name.includes('ardi');
  });
  if (bestFemaleVoice) return bestFemaleVoice;

  // 3. Fallback to any Indonesian voice that is not 'Ardi' (male Microsoft voice)
  const nonMaleVoice = idVoices.find(v => {
    const name = v.name.toLowerCase();
    return !name.includes('ardi') && !name.includes('male');
  });
  if (nonMaleVoice) return nonMaleVoice;

  // 4. Final fallback to the first available Indonesian voice
  return idVoices[0];
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: any) => void;
}

/**
 * Robustly speak Indonesian text using the best available Indonesian Adult Female voice.
 */
export function speakIndonesianText(text: string, options: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options.onError) {
      options.onError(new Error("Text-to-Speech tidak didukung di browser ini."));
    }
    return null;
  }

  try {
    // Cancel any ongoing speech first to avoid overlapping / blocking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    
    // Dynamically retrieve the voice at speak time to ensure it is loaded
    let voice: SpeechSynthesisVoice | null = null;
    
    if (options.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      voice = voices.find(v => v.name === options.voiceName) || null;
    }
    
    if (!voice) {
      voice = getIndonesianFemaleVoice();
    }
    
    if (voice) {
      utterance.voice = voice;
    }
    
    // Set natural rate and pitch for an adult female voice
    utterance.rate = options.rate !== undefined ? options.rate : 1.0; // Clear and snappy
    utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0; // Standard clear pitch

    if (options.onStart) utterance.onstart = options.onStart;
    
    utterance.onend = () => {
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      // Chrome/Safari raise 'interrupted' or 'canceled' when window.speechSynthesis.cancel() is called
      if (e.error === 'interrupted' || e.error === 'canceled') {
        console.log("Speech canceled/interrupted successfully.");
      } else {
        console.warn("Speech synthesis error:", e.error, e);
      }
      if (options.onEnd) options.onEnd();
      if (options.onError) options.onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (error) {
    console.error("Gagal memutar audio Text-to-Speech:", error);
    if (options.onEnd) options.onEnd();
    if (options.onError) options.onError(error);
    return null;
  }
}

/**
 * Warm up speech synthesis so the voices are cached and loaded by the browser.
 */
export function initializeTTS() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
