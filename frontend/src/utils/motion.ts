// 홈 화면의 반복 애니메이션(타이핑, 숫자 올라가기)에서 쓰는 작은 도구들입니다.

export type Alive = () => boolean;

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// from → to 값을 부드럽게 바꾸면서 매 프레임 fn을 호출합니다.
export function tween(
  from: number,
  to: number,
  duration: number,
  fn: (value: number) => void,
  alive: Alive,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      fn(from + (to - from) * easeOut(progress));
      if (progress < 1 && alive()) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

// 글자를 한 글자씩 set으로 넘겨서 타이핑되는 것처럼 보이게 합니다.
export async function typeText(
  text: string,
  speed: number,
  set: (partial: string) => void,
  alive: Alive,
) {
  for (let i = 1; i <= text.length; i++) {
    if (!alive()) return;
    set(text.slice(0, i));
    await sleep(speed);
  }
}
