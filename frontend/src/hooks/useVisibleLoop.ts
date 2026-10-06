import { useEffect, useRef } from 'react';
import type { Alive } from '../utils/motion';

// 요소가 화면에 보이는 동안 play를 실행하고, 화면에서 벗어나면 멈춥니다.
// 다시 보이면 처음부터 다시 시작해요. play 안에서는 alive()가 false가 되면 바로 끝내야 합니다.
export function useVisibleLoop<T extends HTMLElement>(
  play: (alive: Alive) => Promise<void>,
  threshold = 0.35,
) {
  const ref = useRef<T>(null);
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let generation = 0;
    let visible = false;

    const start = () => {
      const mine = ++generation;
      const alive: Alive = () => visible && generation === mine;
      playRef.current(alive).catch(() => undefined);
    };

    if (typeof IntersectionObserver === 'undefined') {
      visible = true;
      start();
      return () => {
        visible = false;
        generation++;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting;
        if (visible && !wasVisible) start();
        else if (!visible) generation++;
      },
      { threshold },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      visible = false;
      generation++;
    };
  }, [threshold]);

  return ref;
}
