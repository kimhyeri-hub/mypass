import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { evaluateSession, generateNextQuestion, generateQuestion, submitAnswer } from '../../api/interview';
import type { QuestionResponse } from '../../api/interview';
import { ApiError } from '../../api/client';
import { useAnswerHint } from '../../hooks/useAnswerHint';
import { useCameraPreview } from '../../hooks/useCameraPreview';
import { useLiveDelivery } from '../../hooks/useLiveDelivery';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import ConfirmModal from '../../components/ConfirmModal';
import ErrorState from '../../components/ErrorState';

interface QuestionItem {
  questionId: number;
  text: string;
  questionType: string | null;
  parentQuestionId: number | null;
}

const LEVEL_BARS = 14;

function toQuestionItem(question: QuestionResponse): QuestionItem {
  return {
    questionId: question.questionId,
    text: question.questionText,
    questionType: question.questionType,
    parentQuestionId: question.parentQuestionId,
  };
}

function formatTime(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function MicIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function LevelBars({ active, level }: { active: boolean; level: number }) {
  return (
    <div className="flex flex-1 gap-[3px]" aria-hidden="true">
      {Array.from({ length: LEVEL_BARS }, (_, index) => (
        <span
          key={index}
          className={`h-[7px] flex-1 rounded ${active && index < level ? 'bg-gradient-to-r from-brand to-[#8F6FF0]' : 'bg-[#ECE8F8]'}`}
        />
      ))}
    </div>
  );
}

export default function LiveInterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();
  const sessionStartedRef = useRef(false);
  const { speak, stopSpeaking, isSpeaking, voiceGender, setVoiceGender, voiceGenderNote } = useTextToSpeech();
  const { startListening, stopListening, isListening, transcript, error: sttError, isSupported } = useSpeechToText();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<'idle' | 'evaluating' | 'failed'>('idle');
  const [evaluationError, setEvaluationError] = useState<{ message: string; code?: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [answerElapsed, setAnswerElapsed] = useState(0);
  const [checkLevel, setCheckLevel] = useState(0);
  const [checkHasMic, setCheckHasMic] = useState(false);
  const evaluatingRef = useRef(false);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    if (!data.sessionId || !data.firstQuestion) {
      queueMicrotask(() => setError('면접 세션을 찾을 수 없어요. 면접 설정부터 다시 진행해 주세요.'));
      return;
    }
    const { questionId, questionText, questionType } = data.firstQuestion;
    queueMicrotask(() => setQuestions([{ questionId, text: questionText, questionType, parentQuestionId: null }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIndex];
  const { setVideoNode, status: cameraStatus, videoElement } = useCameraPreview(
    evaluationStatus === 'idle' && currentQuestion != null,
  );
  const { readDelivery, resetDelivery, voiceLevel } = useLiveDelivery(videoElement, started && isListening);
  const { isOpen: isHintOpen, toggle: toggleHint, hint, error: hintError, isLoading: isHintLoading } = useAnswerHint(
    data.sessionId,
    currentQuestion?.questionId ?? null,
  );

  const isIntroQuestion = currentQuestion?.questionType === 'INTRO';
  const isFollowUpQuestion = !isIntroQuestion && currentQuestion?.parentQuestionId != null;
  const projectQuestions = questions.filter((question) => question.questionType !== 'INTRO');
  const currentProjectQuestionIndex = currentQuestion
    ? projectQuestions.findIndex((question) => question.questionId === currentQuestion.questionId)
    : -1;
  const isLastQuestion = !isIntroQuestion && currentProjectQuestionIndex + 1 >= data.questionCount;
  const previousQuestions = questions.slice(Math.max(0, currentIndex - 2), currentIndex);
  const phase = isSubmitting ? 'processing' : isSpeaking ? 'speaking' : 'listening';
  const shownAnswer = isListening ? transcript : answer;
  const micLevel = started ? voiceLevel : checkLevel;
  const hasMic = started ? isSupported : checkHasMic;

  useEffect(() => {
    if (started) return undefined;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let timer = 0;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) return undefined;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((next) => {
        if (cancelled) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = next;
        setCheckHasMic(true);
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        audioContext.createMediaStreamSource(next).connect(analyser);
        const buffer = new Uint8Array(analyser.fftSize);
        timer = window.setInterval(() => {
          analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let index = 0; index < buffer.length; index += 1) {
            const value = (buffer[index] - 128) / 128;
            sum += value * value;
          }
          setCheckLevel(Math.min(LEVEL_BARS, Math.round(Math.sqrt(sum / buffer.length) * LEVEL_BARS * 4)));
        }, 80);
      })
      .catch(() => {
        if (!cancelled) setCheckHasMic(false);
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
      setCheckLevel(0);
    };
  }, [started]);

  useEffect(() => {
    if (!started) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!isListening) return undefined;
    const timer = window.setInterval(() => setAnswerElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isListening]);

  useEffect(() => {
    if (!started || !currentQuestion) return undefined;
    speak(currentQuestion.text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentQuestion?.questionId]);

  useEffect(() => {
    resetDelivery();
  }, [currentQuestion?.questionId, resetDelivery]);

  useEffect(() => {
    if (isListening) queueMicrotask(() => setAnswer(transcript));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const runEvaluation = async (sessionId: number) => {
    if (evaluatingRef.current) return;
    evaluatingRef.current = true;
    stopSpeaking();
    setEvaluationError(null);
    setEvaluationStatus('evaluating');
    try {
      const evaluated = await evaluateSession(sessionId);
      navigate(`/interview/result/${sessionId}`, { state: { session: evaluated } });
    } catch (err) {
      setEvaluationError(
        err instanceof ApiError ? { message: err.message, code: err.status } : { message: 'AI 평가 요청에 실패했어요.' },
      );
      setEvaluationStatus('failed');
    } finally {
      evaluatingRef.current = false;
    }
  };

  const handleSubmitAnswer = async (textOverride?: string) => {
    const text = (textOverride ?? shownAnswer).trim();
    if (!text) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }
    if (!data.sessionId || !currentQuestion) return;

    const delivery = readDelivery(text);
    if (isListening) stopListening();
    setError('');
    setIsSubmitting(true);
    try {
      const submittedAnswer = await submitAnswer(data.sessionId, currentQuestion.questionId, {
        answerText: text,
        ...delivery,
      });
      setAnswer('');
      setAnswerElapsed(0);

      if (isIntroQuestion) {
        const firstProjectQuestion = await generateQuestion(data.sessionId);
        setQuestions((prev) => [...prev, toQuestionItem(firstProjectQuestion)]);
        setCurrentIndex((prev) => prev + 1);
        return;
      }
      if (isLastQuestion) {
        await runEvaluation(data.sessionId);
        return;
      }
      const nextQuestion = await generateNextQuestion(
        data.sessionId,
        currentQuestion.questionId,
        submittedAnswer.answerId,
      );
      setQuestions((prev) => [...prev, toQuestionItem(nextQuestion)]);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '답변 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicClick = () => {
    if (phase !== 'listening' || isSubmitting) return;
    if (isListening) {
      stopListening();
      void handleSubmitAnswer(transcript || answer);
      return;
    }
    stopSpeaking();
    if (error) setError('');
    setAnswerElapsed(0);
    startListening();
  };

  if (evaluationStatus === 'evaluating') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-7 h-16 w-16 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
        <div className="mb-2 text-lg font-bold text-ink">면접 결과를 분석하고 있어요</div>
        <p className="mb-8 max-w-[320px] text-sm leading-relaxed text-muted">답변을 바탕으로 AI 피드백을 생성하고 있어요. 잠시만 기다려주세요.</p>
        <div className="mt-2 text-[11.5px] text-muted">보통 10~20초 정도 걸려요. 이 화면을 닫지 말아주세요.</div>
      </div>
    );
  }

  if (evaluationStatus === 'failed' && data.sessionId) {
    const sessionId = data.sessionId;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState
          title="면접 결과를 분석하지 못했어요"
          description={`${evaluationError?.message ?? 'AI 평가 요청에 실패했어요.'} 답변은 모두 저장되어 있어요. 다시 시도하면 평가만 다시 요청해요.`}
          code={evaluationError?.code}
          onRetry={() => runEvaluation(sessionId)}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 max-w-[280px] text-sm text-red-500">{error || '질문을 불러오는 중이에요...'}</p>
        {error && (
          <button type="button" onClick={() => navigate('/interview/setup')} className="rounded-lg border border-stroke px-5 py-2.5 text-sm text-[#3A3355]">
            ← 이전으로 돌아가기
          </button>
        )}
      </div>
    );
  }

  if (!started) {
    const cameraReady = cameraStatus === 'ready';
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10">
        <div className="w-full max-w-[560px] rounded-[28px] border border-stroke bg-white p-6 shadow-[0_24px_48px_-32px_rgba(30,18,64,0.18)]">
          <div className="mb-4 text-xl font-extrabold text-ink">면접 전에 카메라와 마이크를 확인해요</div>
          <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-[20px] bg-[#1C1730]">
            <video ref={setVideoNode} autoPlay playsInline muted aria-label="내 카메라 미리보기" className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {cameraStatus !== 'ready' && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white">
                {cameraStatus === 'pending' ? '카메라를 준비하고 있어요.' : '카메라를 사용할 수 없어요. 면접은 계속할 수 있어요.'}
              </p>
            )}
          </div>
          <div className="mb-4 flex gap-3">
            <div className="flex-1 rounded-2xl border border-stroke px-4 py-3.5">
              <div className="text-sm font-extrabold text-ink">카메라 {cameraReady ? '연결됨' : '확인 중'}</div>
            </div>
            <div className="flex-1 rounded-2xl border border-stroke px-4 py-3.5">
              <div className="mb-2 text-sm font-extrabold text-ink">마이크 {checkHasMic ? '연결됨' : '확인 중'}</div>
              <LevelBars active={checkHasMic} level={checkLevel} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/mypage')} className="w-[140px] rounded-2xl border border-stroke py-4 text-base font-extrabold text-muted">
              나가기
            </button>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="flex-1 rounded-2xl bg-gradient-to-br from-brand to-[#8F6FF0] py-4 text-base font-extrabold text-white"
            >
              면접 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressLabel = isIntroQuestion ? '자기소개' : `질문 ${currentProjectQuestionIndex + 1} / ${data.questionCount}`;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex items-center justify-between gap-4 border-b border-stroke bg-white px-6 py-[18px] xl:px-10">
        <div className="text-[13px] font-bold text-ink">
          {progressLabel}
          {isFollowUpQuestion && <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">꼬리질문</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[13px] font-bold tabular-nums text-ink">{formatTime(elapsed)}</div>
          <button type="button" onClick={() => setIsExitModalOpen(true)} className="rounded-xl border border-[#F3D7DC] bg-white px-4 py-2 text-xs font-bold text-[#B5495A]">
            면접 종료
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-7 px-6 pb-9 pt-6 xl:flex-row xl:px-10">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[22px] pb-4">
          {previousQuestions.map((question) => (
            <div key={question.questionId} className="flex items-center gap-3 opacity-75">
              <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#B9AAF2] text-[11px] font-extrabold text-white">AI</div>
              <span className="truncate rounded-[6px_16px_16px_16px] border border-[#EDE8FA] bg-white px-4 py-2.5 text-[15px] text-[#6B6483]">{question.text}</span>
              <span className="flex-shrink-0 rounded-full bg-[#EAF7F0] px-2.5 py-1 text-xs font-extrabold text-[#2FA36B]">답변 완료</span>
            </div>
          ))}

          <div className="flex items-start gap-3">
            <div className="relative mt-5 h-10 w-10 flex-shrink-0">
              {phase === 'speaking' && <span className="absolute inset-0 animate-[live-ring_1.8s_ease-out_infinite] rounded-full border-2 border-brand/35" />}
              <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-brand text-[13px] font-extrabold text-white">AI</div>
            </div>
            <div className="min-w-0 max-w-[620px]">
              <div className="mb-1.5 flex items-center gap-2 pl-1 text-[13px]">
                <span className="font-bold text-ink">면접관</span>
                <span className="font-semibold text-muted">{progressLabel}</span>
              </div>
              <div className="rounded-[4px_22px_22px_22px] border border-[#E6DFFB] bg-[#F7F4FF] px-6 py-[18px] text-base font-medium leading-[1.7] text-ink">{currentQuestion.text}</div>
              <button type="button" onClick={toggleHint} className="mt-3 text-xs font-bold text-brand">
                {isHintOpen ? '답변 힌트 숨기기' : '답변 힌트 보기'}
              </button>
              {isHintOpen && (
                <div className="mt-2 rounded-2xl border border-stroke bg-white px-4 py-3 text-xs leading-relaxed text-muted">
                  {isHintLoading && '모범답안을 준비하고 있어요.'}
                  {!isHintLoading && hintError}
                  {!isHintLoading && hint}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            {phase === 'listening' && isListening ? (
              <div className="flex max-w-[520px] items-center gap-3.5 rounded-[24px_6px_24px_24px] bg-brand px-6 py-[17px] text-[15px] font-bold text-white">
                <span>답변 듣는 중</span>
                <span className="text-[13px] tabular-nums opacity-85">{formatTime(answerElapsed)}</span>
              </div>
            ) : phase === 'processing' ? (
              <div className="rounded-[24px_6px_24px_24px] bg-brand px-6 py-[17px] text-[15px] font-bold text-white">답변을 정리하고 있어요</div>
            ) : (
              <div className="rounded-[24px_6px_24px_24px] border-[1.5px] border-dashed border-[#D5C9FA] bg-white px-6 py-[17px] text-sm font-semibold text-[#9A93B5]">
                {phase === 'speaking' ? 'AI가 질문하는 중이에요. 끝나면 답변해 주세요' : '준비되면 마이크를 눌러 답변해 주세요'}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-shrink-0 flex-col self-center rounded-[28px] border border-stroke bg-white p-[14px] shadow-[0_26px_44px_-34px_rgba(108,78,224,0.5)] sm:max-w-[640px] xl:w-[480px] xl:max-w-none xl:self-start">
          <div className="relative h-[300px] w-full overflow-hidden rounded-[20px] bg-[#1C1730] sm:h-[400px] xl:h-[360px]">
            <video ref={setVideoNode} autoPlay playsInline muted aria-label="내 카메라 미리보기" className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {cameraStatus !== 'ready' && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-white">
                {cameraStatus === 'pending' ? '카메라를 불러오는 중이에요' : '카메라를 사용할 수 없어요. 면접은 계속할 수 있어요.'}
              </p>
            )}
            {cameraStatus === 'ready' && (
              <div className="absolute left-3.5 top-3.5 flex items-center gap-[7px] rounded-full bg-black/45 px-3 py-1.5 text-[13px] font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-[#46D39A]" />내 카메라
              </div>
            )}
          </div>

          <div className="mx-2 mt-3.5 flex items-center gap-2.5 text-[12.5px] font-bold text-muted">
            <MicIcon className="h-4 w-4" />
            <span className="whitespace-nowrap">{hasMic ? '마이크' : '마이크 연결 안 됨'}</span>
            <LevelBars active={hasMic} level={micLevel} />
          </div>

          <div className="flex items-center gap-[18px] px-2 pb-1 pt-4">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={phase !== 'listening' || !isSupported}
              aria-label={isListening ? '답변 완료' : '답변 시작'}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${
                phase === 'listening' ? 'bg-gradient-to-br from-brand to-[#8F6FF0]' : 'bg-[#D9D4EC]'
              }`}
            >
              {isListening ? <StopIcon className="h-[22px] w-[22px]" /> : <MicIcon className="h-7 w-7" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-extrabold text-ink">
                {phase === 'speaking' ? '질문 읽는 중' : phase === 'processing' ? '답변 저장 중' : isListening ? '답변 듣는 중' : '답변 대기'}
              </div>
              <div className="mt-0.5 text-xs text-muted">{phase === 'speaking' ? '끝나면 마이크를 눌러 주세요' : '말로 답하거나 아래에 적어도 돼요'}</div>
            </div>
            <button type="button" onClick={() => speak(currentQuestion.text)} disabled={isSpeaking || isSubmitting} className="whitespace-nowrap text-[13.5px] font-bold text-muted disabled:opacity-40">
              질문 다시 듣기
            </button>
          </div>

          <div className="mt-3 flex gap-1 px-2" role="group" aria-label="면접관 목소리 선택">
            {(['male', 'female'] as const).map((gender) => (
              <button
                key={gender}
                type="button"
                aria-pressed={voiceGender === gender}
                onClick={() => {
                  setVoiceGender(gender);
                  speak(currentQuestion.text);
                }}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${voiceGender === gender ? 'border-brand text-brand' : 'border-stroke text-muted'}`}
              >
                {gender === 'male' ? '남성' : '여성'}
              </button>
            ))}
          </div>
          {voiceGenderNote && <p className="mt-1 px-2 text-[11px] leading-relaxed text-muted">{voiceGenderNote}</p>}

          <textarea
            value={shownAnswer}
            onChange={(event) => {
              setAnswer(event.target.value);
              if (error) setError('');
            }}
            placeholder="음성 인식 결과가 여기 표시돼요. 직접 고쳐도 돼요."
            rows={3}
            className="mt-3 w-full resize-none rounded-2xl border border-stroke px-4 py-3 text-sm text-ink focus:border-brand focus:outline-none"
          />
          {(error || sttError) && <p className="mt-2 px-1 text-xs text-red-500">{error || sttError}</p>}
          <button
            type="button"
            onClick={() => void handleSubmitAnswer()}
            disabled={isSubmitting || phase === 'speaking'}
            className="mt-3 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {isSubmitting ? '제출 중...' : '답변 제출'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="정말 면접을 종료하시겠어요?"
        description="지금까지 답변한 내용은 저장되지 않고 사라져요."
        confirmLabel="종료하기"
        cancelLabel="계속하기"
        onConfirm={() => navigate('/mypage')}
        onCancel={() => setIsExitModalOpen(false)}
      />
    </div>
  );
}
