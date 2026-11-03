import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';

type Phase = 'speaking' | 'listening' | 'processing';
type CamStatus = 'loading' | 'ready' | 'error';
// 카메라/마이크를 못 쓸 때의 원인. 원인별로 다른 안내 문구를 보여줍니다.
type MediaIssue = 'denied' | 'notfound' | 'busy' | 'unsupported' | 'unknown';

const SPEAKING_DURATION_MS = 2600; // TODO: 실제로는 TTS 음성 재생이 끝나는 시점에 맞춰 전환합니다.
const PROCESSING_DURATION_MS = 1100; // TODO: 실제로는 STT 결과를 서버에 제출하고 응답을 받는 시간입니다.
const LEVEL_BARS = 14; // 마이크 입력 레벨 막대 개수

const ISSUE_MESSAGES: Record<MediaIssue, { title: string; sub: string }> = {
  denied: {
    title: '카메라 권한이 필요해요',
    sub: "주소창 왼쪽 자물쇠 아이콘에서 카메라와 마이크를 '허용'으로 바꾼 뒤 다시 시도해 주세요",
  },
  notfound: {
    title: '카메라를 찾을 수 없어요',
    sub: '카메라가 연결되어 있는지 확인한 뒤 다시 시도해 주세요',
  },
  busy: {
    title: '카메라를 사용할 수 없어요',
    sub: '줌 같은 다른 프로그램이 카메라를 쓰고 있을 수 있어요',
  },
  unsupported: {
    title: '이 브라우저에서는 카메라를 쓸 수 없어요',
    sub: '최신 Chrome에서 localhost 또는 https 주소로 접속해 주세요',
  },
  unknown: {
    title: '카메라를 불러오지 못했어요',
    sub: '잠시 후 다시 시도해 주세요',
  },
};

function classifyMediaError(err: unknown): MediaIssue {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notfound';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'unknown';
}

function formatTime(totalSeconds: number) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// 아이콘 폰트(CDN)에 의존하지 않도록 인라인 SVG로 그립니다.
function MicIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function StopIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}

function CameraOffIcon({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18M10.5 6H14a2 2 0 0 1 2 2v2.5l5-3v9M16 16v.5a1.5 1.5 0 0 1-1.5 1.5H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2" />
    </svg>
  );
}

export default function LiveInterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const questions = useMemo(
    () => getDummyQuestions(data.projectName, data.questionCount),
    [data.projectName, data.questionCount],
  );

  // 카메라·마이크 확인 화면을 거쳐 "면접 시작"을 눌러야 질문이 시작됩니다.
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replayCount, setReplayCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('speaking');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answerElapsed, setAnswerElapsed] = useState(0);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  // 현재 질문 바로 앞의 지난 질문 최대 2개만 작게 보여줍니다.
  const previousQuestions = questions.slice(Math.max(0, currentIndex - 2), currentIndex);

  // 전체 면접 경과 시간
  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [started]);

  // 내 답변 경과 시간 (녹음 중일 때만 흐릅니다)
  useEffect(() => {
    if (!isRecording) {
      setAnswerElapsed(0);
      return;
    }
    const timer = setInterval(() => setAnswerElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  // ── 웹캠 + 마이크 ───────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  // 비동기 요청이 끝난 시점에 이미 화면을 떠났거나 다시 시도한 경우를 걸러내기 위한 번호표입니다.
  const mediaTokenRef = useRef(0);

  const [camStatus, setCamStatus] = useState<CamStatus>('loading');
  const [issue, setIssue] = useState<MediaIssue | null>(null);
  const [hasMic, setHasMic] = useState(false);
  const [errName, setErrName] = useState(''); // 원인 확인용(화면에 작게 표시)
  const [level, setLevel] = useState(0);

  const stopMedia = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLevel(0);
  }, []);

  // 마이크 입력 크기를 읽어서 레벨 막대에 반영합니다. 오디오 트랙이 없으면 false를 돌려줘요.
  const startMeter = useCallback((stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track) return false;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return true; // 마이크는 있지만 레벨 막대만 그릴 수 없는 경우

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    audioCtxRef.current = ctx;

    const buffer = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);
      setLevel(Math.min(LEVEL_BARS, Math.round(rms * LEVEL_BARS * 4)));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return true;
  }, []);

  const startMedia = useCallback(async () => {
    mediaTokenRef.current += 1;
    const token = mediaTokenRef.current;

    stopMedia();
    setCamStatus('loading');
    setIssue(null);
    setErrName('');
    setHasMic(false);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setIssue('unsupported');
      setCamStatus('error');
      return;
    }

    const attach = (stream: MediaStream) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamStatus('ready');
      setHasMic(startMeter(stream));
    };
    const isStale = (stream?: MediaStream) => {
      if (token === mediaTokenRef.current) return false;
      stream?.getTracks().forEach((track) => track.stop());
      return true;
    };

    // 1) 카메라+마이크 한 번에 → 2) 안 되면 카메라만 → 3) 그래도 안 되면 마이크만
    //    (마이크만 막혀 있어도 카메라는 보이도록 나눠서 시도합니다.)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (isStale(stream)) return;
      attach(stream);
      return;
    } catch (err) {
      console.error('getUserMedia(video+audio) 실패:', err);
      if (token !== mediaTokenRef.current) return;
    }

    try {
      const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
      if (isStale(videoOnly)) return;
      attach(videoOnly);
      return;
    } catch (err) {
      console.error('getUserMedia(video) 실패:', err);
      if (token !== mediaTokenRef.current) return;
      setIssue(classifyMediaError(err));
      setErrName((err as { name?: string } | null)?.name ?? '');
      setCamStatus('error');
    }

    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isStale(audioOnly)) return;
      streamRef.current = audioOnly;
      setHasMic(startMeter(audioOnly));
    } catch {
      // 마이크도 쓸 수 없는 경우: 더미 진행은 계속되므로 별도 처리 없이 넘어갑니다.
    }
  }, [startMeter, stopMedia]);

  // 확인 화면 → 면접 화면으로 바뀌면 <video>가 새로 만들어지므로 스트림을 다시 연결합니다.
  useEffect(() => {
    if (camStatus === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [started, camStatus]);

  useEffect(() => {
    startMedia();
    return () => {
      mediaTokenRef.current += 1; // 진행 중이던 요청 결과는 무시
      stopMedia(); // 화면을 나갈 때 카메라/마이크 표시등이 꺼지도록 트랙을 모두 정지
    };
  }, [startMedia, stopMedia]);

  // ── 질문 진행 ───────────────────────────────────────────────
  // 질문이 바뀌거나 "다시 듣기"를 누르면 AI가 음성으로 질문을 읽어주는 단계부터 다시 시작
  useEffect(() => {
    if (!started) return;
    setPhase('speaking');
    setIsRecording(false);
    // TODO: 실제로는 여기서 TTS로 currentQuestion을 재생합니다.
    const timer = setTimeout(() => setPhase('listening'), SPEAKING_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentIndex, replayCount]);

  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMicClick = () => {
    if (phase !== 'listening') return;

    // 브라우저가 오디오 처리를 멈춰둔 경우를 대비해, 사용자가 누를 때 다시 깨웁니다.
    audioCtxRef.current?.resume().catch(() => undefined);

    if (!isRecording) {
      // TODO: 실제 음성 답변 녹음/STT 시작
      setIsRecording(true);
      return;
    }

    // TODO: 실제 음성 녹음 종료 및 STT 결과 제출
    setIsRecording(false);
    setPhase('processing');
    processingTimerRef.current = setTimeout(() => {
      if (isLastQuestion) {
        navigate('/interview/result');
        return;
      }
      setCurrentIndex((prev) => prev + 1);
    }, PROCESSING_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, []);

  // 다시 듣기: 질문 읽기 단계부터 다시 시작합니다. (replayCount가 바뀌면 위의 effect가 다시 실행돼요)
  const handleReplay = () => {
    if (phase === 'processing') return;
    setReplayCount((prev) => prev + 1);
  };

  const stateLabel =
    phase === 'speaking'
      ? 'AI가 질문을 말하고 있어요'
      : phase === 'listening'
        ? isRecording
          ? '답변을 듣고 있어요'
          : '내 차례예요'
        : '답변을 확인하고 있어요';

  const stateSub =
    phase === 'speaking'
      ? '음성으로 질문을 읽어드리고 있어요'
      : phase === 'listening'
        ? isRecording
          ? '답변이 끝나면 마이크를 다시 눌러주세요'
          : '준비되면 마이크를 눌러 답변해 주세요'
        : '잠시만 기다려주세요';

  const stateDotClass =
    phase === 'speaking' ? 'bg-[#8F6FF0]' : phase === 'listening' ? 'bg-[#46D39A]' : 'bg-[#F2B84B]';

  const issueMessage = issue ? ISSUE_MESSAGES[issue] : null;

  // ── 면접 전 카메라·마이크 확인 화면 ─────────────────────────────
  if (!started) {
    const camOk = camStatus === 'ready';
    return (
      <div className="min-h-screen bg-canvas px-6 py-10 xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[760px]">
          <h1 className="text-[26px] font-extrabold text-ink">면접 전, 카메라와 마이크를 확인해요</h1>
          <p className="mb-6 mt-2 text-sm text-muted">
            실전처럼 진행돼요. 얼굴이 화면 가운데에 보이고 마이크 소리가 잡히는지 확인한 뒤 시작해 주세요.
          </p>

          <div className="rounded-[28px] border border-stroke bg-white p-[14px] shadow-[0_26px_44px_-34px_rgba(108,78,224,0.5)]">
            <div className="relative h-[300px] w-full overflow-hidden rounded-[20px] bg-ink sm:h-[360px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover [transform:scaleX(-1)] ${camOk ? '' : 'hidden'}`}
              />
              {camStatus === 'loading' && (
                <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-white/60">
                  카메라를 불러오는 중이에요
                </div>
              )}
              {camStatus === 'error' && issueMessage && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-[#2A2540] px-8 text-center text-white">
                  <CameraOffIcon className="h-11 w-11 text-[#F2B8C0]" />
                  <b className="text-lg">{issueMessage.title}</b>
                  <span className="text-[13px] leading-relaxed text-white/75">{issueMessage.sub}</span>
                  {errName && <span className="text-[11px] text-white/40">오류 코드: {errName}</span>}
                  <button
                    type="button"
                    onClick={startMedia}
                    className="mt-1.5 rounded-xl bg-white px-5 py-[11px] text-sm font-extrabold text-brand-dark hover:bg-card"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              {camOk && (
                <div className="absolute left-3.5 top-3.5 flex items-center gap-[7px] rounded-full bg-black/45 px-3 py-1.5 text-[13px] font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-[#46D39A]" />내 카메라
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 px-2.5 pb-1.5 pt-4 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-stroke px-4 py-3.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-extrabold ${
                      camOk ? 'bg-[#EAF7F0] text-[#2FA36B]' : 'bg-[#FDEEEF] text-[#B5495A]'
                    }`}
                  >
                    {camOk ? '✓' : '!'}
                  </span>
                  카메라
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  {camOk
                    ? '정상적으로 연결됐어요'
                    : camStatus === 'loading'
                      ? '확인하고 있어요'
                      : '연결되지 않았어요'}
                </p>
              </div>

              <div className="flex-1 rounded-2xl border border-stroke px-4 py-3.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-extrabold ${
                      hasMic ? 'bg-[#EAF7F0] text-[#2FA36B]' : 'bg-[#FDEEEF] text-[#B5495A]'
                    }`}
                  >
                    {hasMic ? '✓' : '!'}
                  </span>
                  마이크
                </div>
                <div className="mt-2.5 flex gap-[3px]" aria-hidden="true">
                  {Array.from({ length: LEVEL_BARS }, (_, i) => (
                    <span
                      key={i}
                      className={`h-[7px] flex-1 rounded ${
                        hasMic && i < level ? 'bg-gradient-to-r from-brand to-[#8F6FF0]' : 'bg-[#ECE8F8]'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  {hasMic ? '말해 보세요. 막대가 움직이면 정상이에요' : '마이크를 확인해 주세요'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-2.5 pb-2 pt-[18px]">
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="w-[140px] flex-shrink-0 rounded-2xl border border-stroke bg-white py-4 text-base font-extrabold text-muted hover:bg-card"
              >
                나가기
              </button>
              <button
                type="button"
                onClick={() => setStarted(true)}
                disabled={!camOk}
                className={`flex-1 rounded-2xl py-4 text-base font-extrabold text-white ${
                  camOk
                    ? 'bg-gradient-to-br from-brand to-[#8F6FF0] shadow-[0_14px_28px_-12px_rgba(108,78,224,0.55)]'
                    : 'cursor-not-allowed bg-[#D9D4EC]'
                }`}
              >
                면접 시작
              </button>
            </div>

            {camStatus === 'error' && (
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="mx-auto mb-2 block text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                카메라 없이 시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* 상단 바 (로고는 왼쪽 사이드바에 있어서 뺐어요) */}
      <div className="flex items-center justify-between gap-4 border-b border-stroke bg-white px-6 py-[18px] xl:px-10">
        <div className="hidden items-center gap-2 text-[13px] font-bold text-ink sm:flex">
          <span>
            질문 {currentIndex + 1} / {questions.length}
          </span>
          <div className="ml-1 flex items-center gap-[6px]">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-[6px] w-[30px] rounded-full ${
                  i < currentIndex
                    ? 'bg-brand'
                    : i === currentIndex
                      ? ''
                      : 'bg-[#E4DEF8]'
                }`}
                style={
                  i === currentIndex
                    ? { background: 'linear-gradient(90deg, #6C4EE0 50%, #E4DEF8 50%)' }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[13px] font-bold tabular-nums text-ink">{formatTime(elapsed)}</div>
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="rounded-xl border border-[#F3D7DC] bg-white px-4 py-2 text-xs font-bold text-[#B5495A] hover:bg-[#FDEEEF]"
          >
            면접 종료
          </button>
        </div>
      </div>

      {/* 본문: 왼쪽 대화 로그 + 오른쪽 카메라 카드 */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-7 px-6 pb-9 pt-6 xl:flex-row xl:px-10">
        {/* 대화 로그 */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[22px] pb-4">
          {previousQuestions.map((question, i) => (
            <div key={`${currentIndex}-${i}`} className="flex items-center gap-3 opacity-75">
              <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#B9AAF2] text-[11px] font-extrabold text-white">
                AI
              </div>
              <span className="truncate rounded-[6px_16px_16px_16px] border border-[#EDE8FA] bg-white px-4 py-2.5 text-[15px] text-[#6B6483]">
                {question}
              </span>
              <span className="flex-shrink-0 rounded-full bg-[#EAF7F0] px-2.5 py-1 text-xs font-extrabold text-[#2FA36B]">
                ✓ 답변 완료
              </span>
            </div>
          ))}

          {/* 현재 질문 */}
          <div className="flex items-start gap-3">
            <div className="relative mt-5 h-10 w-10 flex-shrink-0">
              {phase === 'speaking' && (
                <span className="absolute inset-0 animate-[live-ring_1.8s_ease-out_infinite] rounded-full border-2 border-brand/35" />
              )}
              <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-brand text-[13px] font-extrabold text-white">
                AI
              </div>
            </div>

            <div className="min-w-0 max-w-[620px]">
              <div className="mb-1.5 flex items-center gap-2 pl-1 text-[13px]">
                <span className="font-bold text-ink">면접관</span>
                <span className="font-semibold text-muted">질문 {currentIndex + 1}</span>
                {phase === 'speaking' && (
                  <span className="flex h-[14px] items-end gap-[3px]" aria-hidden="true">
                    {[8, 13, 6, 11].map((h, i) => (
                      <i
                        key={i}
                        className="block w-[3px] animate-pulse rounded-sm bg-brand"
                        style={{ height: h, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="rounded-[4px_22px_22px_22px] border border-[#E6DFFB] bg-[#F7F4FF] px-6 py-[18px] text-base font-medium leading-[1.7] text-ink xl:text-[17px]">
                {currentQuestion}
              </div>
            </div>
          </div>

          {/* 내 답변 상태 말풍선 */}
          <div className="flex justify-end">
            {phase === 'listening' && isRecording ? (
              <div className="flex items-center gap-3.5 rounded-[24px_6px_24px_24px] bg-brand px-6 py-[17px] text-[15px] font-bold text-white shadow-[0_18px_30px_-20px_rgba(108,78,224,0.9)]">
                <div className="flex h-[30px] items-center gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-1 animate-[live-bar_1s_ease-in-out_infinite] rounded-full bg-white"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
                <span>답변 듣는 중</span>
                <span className="text-[13px] tabular-nums opacity-85">
                  {formatTime(answerElapsed)}
                </span>
              </div>
            ) : phase === 'processing' ? (
              <div className="flex items-center gap-2.5 rounded-[24px_6px_24px_24px] bg-brand px-6 py-[17px] text-[15px] font-bold text-white">
                답변을 정리하고 있어요
                <span className="flex gap-[5px]" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <i
                      key={i}
                      className="block h-2 w-2 animate-pulse rounded-full bg-white"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
              </div>
            ) : (
              <div className="rounded-[24px_6px_24px_24px] border-[1.5px] border-dashed border-[#D5C9FA] bg-white px-6 py-[17px] text-sm font-semibold text-[#9A93B5]">
                {phase === 'speaking'
                  ? 'AI가 질문하는 중이에요. 끝나면 답변해 주세요'
                  : '준비되면 마이크를 눌러 답변해 주세요'}
              </div>
            )}
          </div>
        </div>

        {/* 카메라 + 컨트롤 카드 */}
        <div className="flex w-full flex-shrink-0 flex-col rounded-[28px] border border-stroke bg-white p-[14px] shadow-[0_26px_44px_-34px_rgba(108,78,224,0.5)] self-center sm:max-w-[640px] xl:w-[480px] xl:max-w-none xl:self-start 2xl:w-[570px]">
          <div className="relative h-[300px] w-full overflow-hidden rounded-[20px] bg-ink sm:h-[400px] xl:h-[360px] 2xl:h-[450px]">
            {/* video를 항상 렌더링해야 스트림이 준비됐을 때 ref로 바로 연결할 수 있어요. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover [transform:scaleX(-1)] ${
                camStatus === 'ready' ? '' : 'hidden'
              }`}
            />

            {camStatus === 'loading' && (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-white/60">
                카메라를 불러오는 중이에요
              </div>
            )}

            {camStatus === 'error' && issueMessage && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-[#2A2540] px-8 text-center text-white">
                <CameraOffIcon className="h-11 w-11 text-[#F2B8C0]" />
                <b className="text-lg">{issueMessage.title}</b>
                <span className="text-[13px] leading-relaxed text-white/75">{issueMessage.sub}</span>
                  {errName && <span className="text-[11px] text-white/40">오류 코드: {errName}</span>}
                <button
                  type="button"
                  onClick={startMedia}
                  className="mt-1.5 rounded-xl bg-white px-5 py-[11px] text-sm font-extrabold text-brand-dark hover:bg-card"
                >
                  다시 시도
                </button>
              </div>
            )}

            {camStatus === 'ready' && (
              <div className="absolute left-3.5 top-3.5 flex items-center gap-[7px] rounded-full bg-black/45 px-3 py-1.5 text-[13px] font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-[#46D39A]" />내 카메라
              </div>
            )}
          </div>

          {/* 마이크 입력 레벨 */}
          <div className="mx-2 mt-3.5 flex items-center gap-2.5 text-[12.5px] font-bold text-muted">
            <MicIcon className="h-4 w-4" />
            <span className="whitespace-nowrap">{hasMic ? '마이크' : '마이크 연결 안 됨'}</span>
            <div className="flex flex-1 gap-[3px]" aria-hidden="true">
              {Array.from({ length: LEVEL_BARS }, (_, i) => (
                <span
                  key={i}
                  className={`h-[7px] flex-1 rounded ${
                    hasMic && i < level ? 'bg-gradient-to-r from-brand to-[#8F6FF0]' : 'bg-[#ECE8F8]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 컨트롤 한 줄: 마이크 / 상태 / 다시 듣기 */}
          <div className="flex items-center gap-[18px] px-2 pb-1 pt-4">
            <div className="relative h-16 w-16 flex-shrink-0">
              {isRecording && (
                <>
                  <span className="absolute inset-0 animate-[live-ring_1.6s_ease-out_infinite] rounded-full border-2 border-brand/35" />
                  <span className="absolute inset-0 animate-[live-ring_1.6s_ease-out_infinite] rounded-full border-2 border-brand/35 [animation-delay:0.8s]" />
                </>
              )}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={phase !== 'listening'}
                aria-label={isRecording ? '답변 완료' : '답변 시작'}
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-white transition-colors ${
                  phase === 'listening'
                    ? 'cursor-pointer bg-gradient-to-br from-brand to-[#8F6FF0] shadow-[0_14px_28px_-12px_rgba(108,78,224,0.55)]'
                    : 'cursor-default bg-[#D9D4EC]'
                }`}
              >
                {isRecording ? <StopIcon className="h-[22px] w-[22px]" /> : <MicIcon className="h-7 w-7" />}
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${stateDotClass}`} />
                <span className="truncate">{stateLabel}</span>
              </div>
              <div className="mt-0.5 min-h-[16px] text-xs text-muted">{stateSub}</div>
            </div>

            <button
              type="button"
              onClick={handleReplay}
              disabled={phase === 'processing'}
              className="whitespace-nowrap text-[13.5px] font-bold text-muted hover:text-ink disabled:opacity-40"
            >
              ↻ 질문 다시 듣기
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="면접을 종료하시겠어요?"
        description="지금까지의 답변은 저장되지 않아요."
        confirmLabel="종료하기"
        cancelLabel="계속하기"
        onConfirm={() => navigate('/mypage')}
        onCancel={() => setIsExitModalOpen(false)}
      />
    </div>
  );
}
