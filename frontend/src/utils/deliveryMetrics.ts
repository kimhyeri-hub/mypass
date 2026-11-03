export interface FacePoint {
  x: number;
  y: number;
}

function ratio(value: number, start: number, end: number): number | null {
  const span = end - start;
  if (Math.abs(span) < 1e-4) return null;
  return (value - start) / span;
}

function eyeOnScreen(iris: FacePoint, outer: FacePoint, inner: FacePoint, top: FacePoint, bottom: FacePoint) {
  const x = ratio(iris.x, outer.x, inner.x);
  const y = ratio(iris.y, top.y, bottom.y);
  if (x == null || y == null) return false;
  return x >= 0.32 && x <= 0.68 && y >= 0.28 && y <= 0.72;
}

/** 고개가 정면이고 눈동자가 눈 가운데에 있으면 화면을 보고 있는 것으로 센다. */
export function isLookingAtScreen(landmarks: FacePoint[]): boolean {
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftIris = landmarks[468];
  const rightIris = landmarks[473];
  const leftOuter = landmarks[33];
  const leftInner = landmarks[133];
  const leftTop = landmarks[159];
  const leftBottom = landmarks[145];
  const rightOuter = landmarks[263];
  const rightInner = landmarks[362];
  const rightTop = landmarks[386];
  const rightBottom = landmarks[374];
  if (
    !nose ||
    !leftCheek ||
    !rightCheek ||
    !leftIris ||
    !rightIris ||
    !leftOuter ||
    !leftInner ||
    !leftTop ||
    !leftBottom ||
    !rightOuter ||
    !rightInner ||
    !rightTop ||
    !rightBottom
  ) {
    return false;
  }

  const yaw = ratio(nose.x, leftCheek.x, rightCheek.x);
  if (yaw == null || yaw < 0.38 || yaw > 0.62) return false;
  return (
    eyeOnScreen(leftIris, leftOuter, leftInner, leftTop, leftBottom) &&
    eyeOnScreen(rightIris, rightOuter, rightInner, rightTop, rightBottom)
  );
}

/** 말한 구간에서 감지된 음높이. 너무 조용한 구간은 null. */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  let energy = 0;
  for (let i = 0; i < samples.length; i += 1) energy += samples[i] * samples[i];
  if (energy / samples.length < 0.0004) return null;

  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(Math.floor(sampleRate / 80), samples.length - 1);
  let bestLag = -1;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    for (let i = 0; i < samples.length - lag; i += 2) corr += samples[i] * samples[i + lag];
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || best < energy * 0.08) return null;
  return sampleRate / bestLag;
}

/** 음높이가 얼마나 들쭉날쭉한지 0~100. 샘플이 적으면 판단하지 않는다. */
export function voiceVariationScore(pitches: number[]): number | null {
  if (pitches.length < 5) return null;
  const mean = pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length;
  if (mean <= 0) return null;
  const variance = pitches.reduce((sum, pitch) => sum + (pitch - mean) ** 2, 0) / pitches.length;
  const variation = Math.sqrt(variance) / mean;
  return Math.round(Math.min(100, Math.max(0, variation * 350)));
}

export function gazeScore(looking: number, total: number): number | null {
  if (total < 3) return null;
  return Math.round((looking / total) * 100);
}

/** 한글 답변은 띄어쓴 어절 수로 분당 말 속도를 만든다. */
export function speakingRateWpm(text: string, durationSec: number): number | null {
  if (durationSec < 1) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const chunks = trimmed.split(/\s+/).filter(Boolean);
  const words = chunks.length >= 2 ? chunks.length : Math.max(1, Math.round(trimmed.replace(/\s/g, '').length / 2));
  return Math.round(Math.min(400, (words / durationSec) * 60));
}
