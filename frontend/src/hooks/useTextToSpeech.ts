import { useCallback, useEffect, useRef, useState } from 'react';

// 브라우저 내장 음성 합성(SpeechSynthesis)으로 AI 면접관의 질문을 읽어주는 훅.
//
// 기존 코드와 호환: speak(text) / stopSpeaking() / isSpeaking 은 그대로 쓸 수 있어요.
// 추가된 것:
//  - speak(text, onDone): 읽기가 "끝났을 때" 또는 "실패했을 때" onDone을 한 번 불러줘요.
//    (실패해도 면접 흐름이 멈추지 않고 다음 단계로 넘어가게 하려는 용도)
//  - error / isSupported: 화면에서 안내 문구를 보여줄 수 있어요.

// .env 에 VITE_TTS_URL=http://localhost:8000 처럼 적으면, 이 서버(edge-tts)의 자연스러운 목소리를 써요.
// 서버가 꺼져 있거나 실패하면 자동으로 브라우저 내장 목소리로 대신 읽어서 면접이 멈추지 않아요.
const TTS_URL = (import.meta.env.VITE_TTS_URL as string | undefined)?.replace(/\/$/, '');
const SERVER_TIMEOUT_MS = 8000;

// 사용자가 고른 목소리(남성/여성)를 이 브라우저에 기억해둬요. (서버 음성에만 적용돼요)
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
// 이 시간 안에 재생이 시작되지 않으면 실패로 보고 다음 단계로 넘어갑니다.
// (한국어 음성이 없거나 브라우저가 소리를 막은 경우, 아무 이벤트도 오지 않고 조용히 멈춰버리기 때문)
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
  const genderRef = useRef<VoiceGender>(voiceGender); // speak()가 항상 최신 선택을 쓰도록

  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 서버 음성 재생에 쓰는 것들 (요청 취소, 오디오, 임시 주소)
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

      // 이전 발화를 끊고 새로 시작해요. 끊긴 이전 발화의 이벤트는 아래 가드로 무시됩니다.
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
        // 우리가 직접 끊은 경우(cancel)는 실패가 아니에요.
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

  // 서버(edge-tts) 음성을 받아 재생해요. 어떤 이유로든 실패하면 브라우저 목소리로 대신 읽어요.
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!TTS_URL) {
        speakBrowser(text, onDone);
        return;
      }

      stopSpeaking();
      setError(null);
      const token = serverTokenRef.current; // stopSpeaking() 이후의 번호
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
          fallback(); // 서버가 꺼져 있거나 느리거나 소리 재생이 막힌 경우
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
    hasServerVoice: Boolean(TTS_URL), // 서버 음성을 쓸 수 있을 때만 남/여 선택이 가능
  };
}
