import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraPreviewStatus = 'pending' | 'ready' | 'unavailable';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * 실전면접 미리보기용. 영상만 열고 마이크는 열지 않는다.
 * 음성 답변은 음성 인식이 마이크를 따로 쓴다.
 */
export function useCameraPreview(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraPreviewStatus>('pending');
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const attach = useCallback((node: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!node || !stream) return;
    if (node.srcObject !== stream) node.srcObject = stream;
  }, []);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      setVideoElement(node);
      attach(node, streamRef.current);
    },
    [attach],
  );

  useEffect(() => {
    if (!active) {
      stopStream(streamRef.current);
      streamRef.current = null;
      return;
    }

    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }

    setStatus('pending');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        attach(videoRef.current, stream);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [active, attach]);

  return { setVideoNode, status, videoElement };
}
