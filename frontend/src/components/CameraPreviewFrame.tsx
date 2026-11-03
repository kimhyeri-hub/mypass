import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { CameraPreviewStatus } from '../hooks/useCameraPreview';

const MIN_WIDTH = 120;
const MAX_WIDTH = 280;
const ASPECT = 3 / 4;

interface FrameBox {
  x: number;
  y: number;
  width: number;
}

interface CameraPreviewFrameProps {
  containerRef: RefObject<HTMLDivElement | null>;
  setVideoNode: (node: HTMLVideoElement | null) => void;
  cameraStatus: CameraPreviewStatus;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function CameraPreviewFrame({ containerRef, setVideoNode, cameraStatus }: CameraPreviewFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(160);
  const [floating, setFloating] = useState<FrameBox | null>(null);
  const widthRef = useRef(width);
  const floatingRef = useRef(floating);
  widthRef.current = width;
  floatingRef.current = floating;

  const bounds = () => {
    const container = containerRef.current;
    return {
      width: container?.clientWidth ?? MAX_WIDTH,
      height: container?.clientHeight ?? 480,
    };
  };

  const currentBox = (): FrameBox => {
    if (floatingRef.current) return floatingRef.current;
    const frame = frameRef.current?.getBoundingClientRect();
    const parent = containerRef.current?.getBoundingClientRect();
    return {
      x: frame && parent ? frame.left - parent.left : 0,
      y: frame && parent ? frame.top - parent.top : 0,
      width: widthRef.current,
    };
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).dataset.resize === 'true') return;
    event.preventDefault();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    let origin: FrameBox | null = null;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!origin) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
        origin = currentBox();
      }
      const limit = bounds();
      const height = origin.width * ASPECT;
      const next = {
        width: origin.width,
        x: clamp(origin.x + ev.clientX - startX, 0, Math.max(0, limit.width - origin.width)),
        y: clamp(origin.y + ev.clientY - startY, 0, Math.max(0, limit.height - height)),
      };
      floatingRef.current = next;
      setFloating(next);
    };
    const stop = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = currentBox();

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const limit = bounds();
      const grown = Math.max(ev.clientX - startX, ev.clientY - startY);
      const nextWidth = clamp(origin.width + grown, MIN_WIDTH, Math.min(MAX_WIDTH, limit.width - origin.x));
      const height = nextWidth * ASPECT;
      const next = {
        x: origin.x,
        y: clamp(origin.y, 0, Math.max(0, limit.height - height)),
        width: nextWidth,
      };
      if (floatingRef.current) {
        floatingRef.current = next;
        setFloating(next);
      }
      widthRef.current = nextWidth;
      setWidth(nextWidth);
    };
    const stop = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const shownWidth = floating?.width ?? width;
  const height = shownWidth * ASPECT;

  return (
    <div
      ref={frameRef}
      className={floating ? 'absolute z-20 touch-none' : 'flex-shrink-0 touch-none'}
      style={floating ? { left: floating.x, top: floating.y, width: floating.width } : { width: shownWidth }}
    >
      <div onPointerDown={startDrag} className="cursor-grab active:cursor-grabbing" role="group" aria-label="내 화면. 끌어서 옮길 수 있어요.">
        <div
          className="relative overflow-hidden rounded-2xl border border-stroke bg-[#1C1730] shadow-[0_12px_24px_-16px_rgba(30,18,64,0.45)]"
          style={{ height }}
        >
          <video
            ref={setVideoNode}
            autoPlay
            playsInline
            muted
            aria-label="내 카메라 미리보기"
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {cameraStatus !== 'ready' && (
            <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] font-medium leading-relaxed text-white">
              {cameraStatus === 'pending' ? '카메라를 준비하고 있어요.' : '카메라를 사용할 수 없어요. 면접은 계속할 수 있어요.'}
            </p>
          )}
          <button
            type="button"
            data-resize="true"
            aria-label="내 화면 크기 조절"
            onPointerDown={startResize}
            className="absolute bottom-1.5 right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border border-white/70 bg-black/40"
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] font-medium text-muted">끌어서 이동</p>
      </div>
    </div>
  );
}
