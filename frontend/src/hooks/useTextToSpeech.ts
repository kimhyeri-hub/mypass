import { useCallback, useEffect, useRef, useState } from 'react';

const NOT_SUPPORTED_MESSAGE = '이 브라우저는 음성 출력(TTS)을 지원하지 않아요. Chrome 사용을 권장해요.';
const PLAY_FAILED_MESSAGE = '질문을 음성으로 재생하지 못했어요. 질문 글을 보고 답변해 주세요.';

const NO_VOICE_MESSAGE = 'Google 한국의 음성을 찾을 수 없어요. Chrome으로 열어 주세요. 질문 글을 보고 답변해 주세요.';

const START_TIMEOUT_MS = 4000;
const VOICE_LOAD_TIMEOUT_MS = 1500;

function isGoogleKorean(voice: SpeechSynthesisVoice): boolean {
  return (
    voice.lang.replace('_', '-').toLowerCase().startsWith('ko') &&
    voice.name.toLowerCase().includes('google')
  );
}

function pickKoreanVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find(isGoogleKorean);
}

function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().some(isGoogleKorean)) {
      resolve();
      return;
    }
    const finish = () => {
      synth.removeEventListener('voiceschanged', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (synth.getVoices().some(isGoogleKorean)) finish();
    };
    const timer = setTimeout(finish, VOICE_LOAD_TIMEOUT_MS);
    synth.addEventListener('voiceschanged', onChange);
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

        const voice = pickKoreanVoice();
        if (!voice) {
          setError(NO_VOICE_MESSAGE);
          onDone?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.voice = voice;

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
