import { useCallback, useEffect, useRef, useState } from 'react';

const SERVER_TIMEOUT_MS = 8000;

export type VoiceGender = 'male' | 'female';
const GENDER_KEY = 'mypass_tts_gender';
function loadGender(): VoiceGender {
  try {
    return localStorage.getItem(GENDER_KEY) === 'female' ? 'female' : 'male';
  } catch {
    return 'male';
  }
}

const NOT_SUPPORTED_MESSAGE = '이 브라우저는 음성 출력(TTS)을 지원하지 않아요. Chrome 사용을 권장해요.';
const PLAY_FAILED_MESSAGE = '질문을 음성으로 재생하지 못했어요. 질문 글을 보고 답변해 주세요.';
const BROWSER_GENDER_NOTE =
  '이 브라우저에는 선택한 성별의 한국어 음성이 없어, 다른 한국어 음성으로 재생해요. 성별이 다를 수 있어요.';

const START_TIMEOUT_MS = 4000;
const VOICES_WAIT_MS = 400;

// 백엔드 TtsService와 같은 이름으로 성별을 구분한다. InJoon=남, SunHi=여.
// Windows 기본 한국어 음성 Heami(해미)는 여성으로 취급한다.
const MALE_VOICE_HINTS = ['injoon', '인준'];
const FEMALE_VOICE_HINTS = ['sunhi', '선희', 'heami', '해미'];

/**
 * VITE_TTS_URL은 서버 루트, /api, /api/tts 중 어떤 형태로 와도 된다.
 * 끝 슬래시와 이미 붙은 /tts를 걷어 낸 뒤 항상 {base}/api/tts 한 번만 붙인다.
 * 값이 없으면 null이고, 그때는 브라우저 음성을 쓴다.
 */
export function resolveTtsEndpoint(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const base = trimmed.replace(/\/+$/, '').replace(/\/api\/tts$|\/tts$/, '').replace(/\/api$/, '');
  return `${base}/api/tts`;
}

const TTS_ENDPOINT = resolveTtsEndpoint(import.meta.env.VITE_TTS_URL);

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes('natural')) score += 100;
  if (name.includes('online')) score += 50;
  if (name.includes('google')) score += 40;
  if (!voice.localService) score += 10;
  return score;
}

function voiceLabel(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI}`.toLowerCase();
}

function matchesGender(voice: SpeechSynthesisVoice, gender: VoiceGender): boolean {
  const label = voiceLabel(voice);
  const hints = gender === 'male' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;
  return hints.some((hint) => label.includes(hint));
}

function bestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

/**
 * 브라우저 음성 이름에는 성별이 없는 경우가 많다.
 * 이름이 성별과 맞는 한국어 음성이 있으면 그 음성을 쓰고,
 * 없으면 반대 성별이 분명한 음성을 피해 한국어 음성을 고른다.
 * 그때는 호출하는 쪽에서 성별을 보장할 수 없다고 알려야 한다.
 */
function pickKoreanVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
): { voice?: SpeechSynthesisVoice; genderMatched: boolean } {
  const korean = voices.filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  const matched = korean.filter((voice) => matchesGender(voice, gender));
  if (matched.length > 0) {
    return { voice: bestVoice(matched), genderMatched: true };
  }

  const opposite: VoiceGender = gender === 'male' ? 'female' : 'male';
  const withoutOpposite = korean.filter((voice) => !matchesGender(voice, opposite));
  const pool = withoutOpposite.length > 0 ? withoutOpposite : korean;
  return { voice: bestVoice(pool), genderMatched: false };
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const current = window.speechSynthesis.getVoices();
  if (current.length > 0) return Promise.resolve(current);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, VOICES_WAIT_MS);
  });
}

export function useTextToSpeech() {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(loadGender);
  const [voiceGenderNote, setVoiceGenderNote] = useState<string | null>(null);
  const genderRef = useRef<VoiceGender>(voiceGender);

  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const releaseServerAudio = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  // 진행 중인 서버 음성과 브라우저 음성을 모두 끊고, 이후 도착한 응답은 무시한다.
  const interrupt = useCallback(() => {
    generationRef.current += 1;
    releaseServerAudio();
    clearWatchdog();
    currentRef.current = null;
    setIsSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return generationRef.current;
  }, []);

  const stopSpeaking = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const speakBrowser = useCallback(
    async (text: string, token: number, onDone?: () => void) => {
      if (!isSupported) {
        setVoiceGenderNote(null);
        setError(NOT_SUPPORTED_MESSAGE);
        queueMicrotask(() => onDone?.());
        return;
      }

      const voices = await waitForVoices();
      if (generationRef.current !== token) return;

      clearWatchdog();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      const picked = pickKoreanVoice(voices, genderRef.current);
      if (picked.voice) utterance.voice = picked.voice;
      // 이름만으로 성별을 맞추지 못하면 재생은 하되, 화면에서 그 사실을 알린다.
      setVoiceGenderNote(picked.genderMatched ? null : BROWSER_GENDER_NOTE);

      currentRef.current = utterance;
      setError(null);

      let started = false;
      const finish = (failed: boolean) => {
        if (currentRef.current !== utterance) return;
        clearWatchdog();
        currentRef.current = null;
        setIsSpeaking(false);
        if (failed) setError(PLAY_FAILED_MESSAGE);
        onDone?.();
      };

      utterance.onstart = () => {
        if (currentRef.current !== utterance) return;
        started = true;
        clearWatchdog();
        setIsSpeaking(true);
      };
      utterance.onend = () => finish(false);
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') return;
        finish(true);
      };

      watchdogRef.current = setTimeout(() => {
        if (!started && currentRef.current === utterance) {
          window.speechSynthesis.cancel();
          finish(true);
        }
      }, START_TIMEOUT_MS);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const token = interrupt();
      setError(null);
      const stillCurrent = () => generationRef.current === token;

      if (!TTS_ENDPOINT) {
        void speakBrowser(text, token, onDone);
        return;
      }

      setVoiceGenderNote(null);

      const controller = new AbortController();
      abortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
      const fallback = () => {
        clearTimeout(timer);
        if (!stillCurrent()) return;
        releaseServerAudio();
        void speakBrowser(text, token, onDone);
      };

      fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: genderRef.current }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`TTS server ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          clearTimeout(timer);
          if (!stillCurrent()) return;
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          const finish = () => {
            if (!stillCurrent()) return;
            releaseServerAudio();
            setIsSpeaking(false);
            onDone?.();
          };
          audio.onended = finish;
          audio.onerror = fallback;
          return audio.play().then(() => {
            if (!stillCurrent()) return;
            // 서버 음성은 요청한 male/female을 그대로 쓰므로 성별 안내를 지운다.
            setVoiceGenderNote(null);
            setIsSpeaking(true);
          });
        })
        .catch(() => {
          fallback();
        });
    },
    [interrupt, speakBrowser],
  );

  const setVoiceGender = useCallback((gender: VoiceGender) => {
    genderRef.current = gender;
    setVoiceGenderState(gender);
    try {
      localStorage.setItem(GENDER_KEY, gender);
    } catch {
      genderRef.current = gender;
    }
  }, []);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    error,
    isSupported,
    voiceGender,
    setVoiceGender,
    voiceGenderNote,
  };
}
