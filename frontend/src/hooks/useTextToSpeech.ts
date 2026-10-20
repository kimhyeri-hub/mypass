import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const TTS_URL =
  (import.meta.env.VITE_TTS_URL as string | undefined)?.replace(/\/$/, '') ??
  (API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : undefined);
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

const START_TIMEOUT_MS = 4000;

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes('natural')) score += 100;
  if (name.includes('online')) score += 50;
  if (name.includes('google')) score += 40;
  if (name.includes('sunhi') || name.includes('injoon')) score += 20;
  if (!voice.localService) score += 10;
  return score;
}

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  const korean = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  return korean.sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

export function useTextToSpeech() {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(loadGender);
  const genderRef = useRef<VoiceGender>(voiceGender);

  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const serverTokenRef = useRef(0);
  const abortServer = () => {
    serverTokenRef.current += 1;
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

  const stopSpeaking = useCallback(() => {
    abortServer();
    clearWatchdog();
    currentRef.current = null;
    setIsSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakBrowser = useCallback(
    (text: string, onDone?: () => void) => {
      if (!isSupported) {
        setError(NOT_SUPPORTED_MESSAGE);
        queueMicrotask(() => onDone?.());
        return;
      }

      clearWatchdog();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.10;
      utterance.pitch = 1.0;
      const voice = pickKoreanVoice();
      if (voice) utterance.voice = voice;

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
      if (!TTS_URL) {
        speakBrowser(text, onDone);
        return;
      }

      stopSpeaking();
      setError(null);
      const token = serverTokenRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
      const isCurrent = () => serverTokenRef.current === token;
      const fallback = () => {
        if (isCurrent()) speakBrowser(text, onDone);
      };

      fetch(`${TTS_URL}/tts`, {
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
          if (!isCurrent()) return;
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          const finish = () => {
            if (!isCurrent()) return;
            abortServer();
            setIsSpeaking(false);
            onDone?.();
          };
          audio.onended = finish;
          audio.onerror = fallback;
          return audio.play().then(() => {
            if (isCurrent()) setIsSpeaking(true);
          });
        })
        .catch(() => {
          clearTimeout(timer);
          fallback();
        });
    },
    [speakBrowser, stopSpeaking],
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
    hasServerVoice: Boolean(TTS_URL),
  };
}
