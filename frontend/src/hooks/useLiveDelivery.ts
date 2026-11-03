import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { detectPitch, gazeScore, isLookingAtScreen, speakingRateWpm, voiceVariationScore } from '../utils/deliveryMetrics';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface DeliveryScores {
  gazeStabilityScore: number | null;
  voiceTremorScore: number | null;
  speakingRateWpm: number | null;
}

async function createLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  } catch {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  }
}

/**
 * 실전면접에서 사용자가 말하는 동안에만 시선과 음높이를 모은다.
 * 면접 화면에는 보여 주지 않고, 답변을 저장할 때 숫자만 꺼낸다.
 */
export function useLiveDelivery(video: HTMLVideoElement | null, listening: boolean) {
  const videoRef = useRef(video);
  const listeningRef = useRef(listening);
  const lookingRef = useRef(0);
  const gazeTotalRef = useRef(0);
  const pitchesRef = useRef<number[]>([]);
  const listenedMsRef = useRef(0);
  const listenStartedRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const landmarkerTaskRef = useRef<Promise<FaceLandmarker | null> | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const [voiceLevel, setVoiceLevel] = useState(0);

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const ensureLandmarker = useCallback(() => {
    if (landmarkerRef.current) return Promise.resolve(landmarkerRef.current);
    if (!landmarkerTaskRef.current) {
      landmarkerTaskRef.current = createLandmarker()
        .then((landmarker) => {
          landmarkerRef.current = landmarker;
          return landmarker;
        })
        .catch(() => null);
    }
    return landmarkerTaskRef.current;
  }, []);

  useEffect(() => {
    if (!listening) return undefined;

    listenStartedRef.current = performance.now();
    let stopped = false;
    let audioContext: AudioContext | null = null;
    let audioStream: MediaStream | null = null;
    let audioTimer = 0;
    let gazeTimer = 0;

    const startAudio = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (stopped) {
          audioStream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        audioTimer = window.setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          let energy = 0;
          for (let i = 0; i < samples.length; i += 1) energy += samples[i] * samples[i];
          const rms = Math.sqrt(energy / samples.length);
          setVoiceLevel(Math.min(14, Math.round(rms * 14 * 8)));
          const pitch = detectPitch(samples, audioContext?.sampleRate ?? 48000);
          if (pitch != null) pitchesRef.current.push(pitch);
        }, 120);
      } catch {
        audioStream = null;
      }
    };

    const sampleGaze = async () => {
      const currentVideo = videoRef.current;
      if (!currentVideo || currentVideo.readyState < 2 || currentVideo.videoWidth === 0) return;
      const landmarker = await ensureLandmarker();
      if (stopped || !landmarker || !listeningRef.current) return;
      const now = performance.now();
      if (now <= lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = now;
      try {
        const faces = landmarker.detectForVideo(currentVideo, now).faceLandmarks;
        gazeTotalRef.current += 1;
        if (faces[0] && isLookingAtScreen(faces[0])) lookingRef.current += 1;
      } catch {
        // 같은 영상 프레임을 다시 읽으면 MediaPipe가 거절할 수 있다.
      }
    };

    void startAudio();
    gazeTimer = window.setInterval(() => {
      void sampleGaze();
    }, 200);

    return () => {
      stopped = true;
      if (listenStartedRef.current != null) {
        listenedMsRef.current += performance.now() - listenStartedRef.current;
        listenStartedRef.current = null;
      }
      window.clearInterval(audioTimer);
      window.clearInterval(gazeTimer);
      setVoiceLevel(0);
      audioStream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [listening, ensureLandmarker]);

  useEffect(() => {
    return () => {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const resetDelivery = useCallback(() => {
    lookingRef.current = 0;
    gazeTotalRef.current = 0;
    pitchesRef.current = [];
    listenedMsRef.current = 0;
    listenStartedRef.current = listeningRef.current ? performance.now() : null;
    lastVideoTimeRef.current = -1;
  }, []);

  const readDelivery = useCallback((answerText: string): DeliveryScores => {
    let listenedMs = listenedMsRef.current;
    if (listenStartedRef.current != null) listenedMs += performance.now() - listenStartedRef.current;
    return {
      gazeStabilityScore: gazeScore(lookingRef.current, gazeTotalRef.current),
      voiceTremorScore: voiceVariationScore(pitchesRef.current),
      speakingRateWpm: speakingRateWpm(answerText, listenedMs / 1000),
    };
  }, []);

  return { readDelivery, resetDelivery, voiceLevel };
}
