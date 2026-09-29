import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import ConfirmModal from '../../components/ConfirmModal';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';

type Phase = 'speaking' | 'listening' | 'processing';

const SPEAKING_DURATION_MS = 2600; // TODO: 실제로는 TTS 음성 재생이 끝나는 시점에 맞춰 전환합니다.
const PROCESSING_DURATION_MS = 1100; // TODO: 실제로는 STT 결과를 서버에 제출하고 응답을 받는 시간입니다.

function formatTime(totalSeconds: number) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveInterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const questions = useMemo(
    () => getDummyQuestions(data.projectName, data.questionCount),
    [data.projectName, data.questionCount],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('speaking');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // 전체 면접 경과 시간
  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 질문이 바뀌거나 "다시 듣기"를 누르면 AI가 음성으로 질문을 읽어주는 단계부터 다시 시작
  useEffect(() => {
    queueMicrotask(() => {
      setPhase('speaking');
      setIsRecording(false);
    });
    // TODO: 실제로는 여기서 TTS로 currentQuestion을 재생합니다.
    const timer = setTimeout(() => setPhase('listening'), SPEAKING_DURATION_MS);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMicClick = () => {
    if (phase !== 'listening') return;

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

  const handleReplay = () => {
    if (phase === 'processing') return;
    setPhase('speaking');
    setIsRecording(false);
  };

  const stateLabel =
    phase === 'speaking'
      ? 'AI가 질문을 말하고 있어요'
      : phase === 'listening'
        ? isRecording
          ? '답변을 듣고 있어요'
          : '준비되면 마이크를 눌러 답변해 주세요'
        : '답변을 확인하고 있어요';

  const stateSub =
    phase === 'speaking'
      ? '음성으로 질문을 읽어드리고 있어요'
      : phase === 'listening'
        ? isRecording
          ? '답변이 끝나면 마이크를 다시 눌러주세요'
          : ''
        : '잠시만 기다려주세요';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
        <Logo size="sm" to="/" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <i className="ti ti-clock text-sm" aria-hidden="true" />
            {formatTime(elapsed)}
          </div>
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="rounded-lg bg-[#FDEEEF] px-3.5 py-2 text-xs font-semibold text-[#B5495A]"
          >
            면접 종료
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-brand">
          질문 {currentIndex + 1} / {questions.length}
        </div>

        <div className="relative mb-6 flex h-[132px] w-[132px] items-center justify-center">
          {phase === 'speaking' && (
            <>
              <span className="absolute inset-0 animate-[live-ring_1.8s_ease-out_infinite] rounded-full border-2 border-brand/35" />
              <span className="absolute inset-0 animate-[live-ring_1.8s_ease-out_infinite] rounded-full border-2 border-brand/35 [animation-delay:0.6s]" />
              <span className="absolute inset-0 animate-[live-ring_1.8s_ease-out_infinite] rounded-full border-2 border-brand/35 [animation-delay:1.2s]" />
            </>
          )}
          <div className="relative z-10 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8F6FF0] text-white shadow-[0_16px_32px_-16px_rgba(108,78,224,0.55)]">
            <i className="ti ti-robot text-4xl" aria-hidden="true" />
          </div>
        </div>

        <div className="mb-1 text-base font-bold text-ink">{stateLabel}</div>
        <div className="mb-8 min-h-[18px] text-[13px] text-muted">{stateSub || ' '}</div>

        <div className="mb-10 max-w-[480px] rounded-[20px] border border-stroke bg-white px-6 py-5 text-center text-[15px] leading-relaxed text-ink">
          {currentQuestion}
        </div>

        <div className="mb-9 flex h-8 items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-brand transition-all ${
                isRecording ? 'h-[30px] animate-[live-bar_1s_ease-in-out_infinite]' : 'h-2 opacity-35'
              }`}
              style={isRecording ? { animationDelay: `${i * 0.12}s` } : undefined}
            />
          ))}
        </div>

        <div className="relative mb-4 flex h-[76px] w-[76px] items-center justify-center">
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
            className={`relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full text-2xl text-white transition-colors ${
              phase === 'listening'
                ? 'cursor-pointer bg-gradient-to-br from-brand to-[#8F6FF0] shadow-[0_14px_28px_-12px_rgba(108,78,224,0.55)]'
                : 'cursor-default bg-[#D9D4EC]'
            }`}
          >
            <i className={`ti ${isRecording ? 'ti-player-stop' : 'ti-microphone'}`} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleReplay}
          disabled={phase === 'processing'}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted disabled:opacity-40"
        >
          <i className="ti ti-repeat text-sm" aria-hidden="true" />
          질문 다시 듣기
        </button>
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
