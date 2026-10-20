import { useCallback, useEffect, useRef, useState } from 'react';

const NOT_SUPPORTED_MESSAGE = '이 브라우저는 음성 출력(TTS)을 지원하지 않아요. Chrome 사용을 권장해요.';
const PLAY_FAILED_MESSAGE = '질문을 음성으로 재생하지 못했어요. 질문 글을 보고 답변해 주세요.';

const START_TIMEOUT_MS = 4000;
const VOICE_LOAD_TIMEOUT_MS = 1000;

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes('natural')) score += 100;
  if (name.includes('online')) score += 50;
  if (name.includes('google')) score += 40;
  if (name.includes('sunhi')) score += 20;
  if (!voice.localService) score += 10;
  return score;
}

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  const korean = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  return korean.sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length > 0) {
      resolve();
      return;
    }
    const finish = () => {
      synth.removeEventListener('voiceschanged', finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, VOICE_LOAD_TIMEOUT_MS);
    synth.addEventListener('voiceschanged', finish);
  });
}

export function useTextToSpeech() {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    requestRef.current += 1;
    clearWatchdog();
    currentRef.current = null;
    setIsSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [clearWatchdog]);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!isSupported) {
        setError(NOT_SUPPORTED_MESSAGE);
        queueMicrotask(() => onDone?.());
        return;
      }

      requestRef.current += 1;
      const requestId = requestRef.current;
      clearWatchdog();
      currentRef.current = null;
      window.speechSynthesis.cancel();
      setError(null);

      waitForVoices().then(() => {
        if (requestRef.current !== requestId) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        const voice = pickKoreanVoice();
        if (voice) utterance.voice = voice;

        currentRef.current = utterance;

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
      });
    },
    [isSupported, clearWatchdog],
  );

  useEffect(() => stopSpeaking, [stopSpeaking]);

  return { speak, stopSpeaking, isSpeaking, error, isSupported };
}
