import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { evaluateSession, generateNextQuestion, generateQuestion, submitAnswer } from '../../api/interview';
import type { QuestionResponse } from '../../api/interview';
import { ApiError } from '../../api/client';
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

function toQuestionItem(question: QuestionResponse): QuestionItem {
  return {
    questionId: question.questionId,
    text: question.questionText,
    questionType: question.questionType,
    parentQuestionId: question.parentQuestionId,
  };
}

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();
  const startedRef = useRef(false);
  const { speak, stopSpeaking, isSpeaking, voiceGender, setVoiceGender, voiceGenderNote } = useTextToSpeech();
  const { startListening, stopListening, isListening, transcript, error: sttError } = useSpeechToText();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<'idle' | 'evaluating' | 'failed'>('idle');
  const [evaluationError, setEvaluationError] = useState<{ message: string; code?: number } | null>(null);
  const evaluatingRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!data.sessionId || !data.firstQuestion) {
      queueMicrotask(() => setError('면접 세션을 찾을 수 없어요. 면접 설정부터 다시 진행해 주세요.'));
      return;
    }
    const { questionId, questionText, questionType } = data.firstQuestion;
    queueMicrotask(() => setQuestions([{ questionId, text: questionText, questionType, parentQuestionId: null }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIndex];
  const isIntroQuestion = currentQuestion?.questionType === 'INTRO';
  const isFollowUpQuestion = !isIntroQuestion && currentQuestion?.parentQuestionId != null;
  const projectQuestions = questions.filter((q) => q.questionType !== 'INTRO');
  const currentProjectQuestionIndex = currentQuestion
    ? projectQuestions.findIndex((q) => q.questionId === currentQuestion.questionId)
    : -1;
  const isLastQuestion = !isIntroQuestion && currentProjectQuestionIndex + 1 >= data.questionCount;
  const progressPercent = isIntroQuestion ? 0 : ((currentProjectQuestionIndex + 1) / data.questionCount) * 100;

  useEffect(() => {
    if (currentQuestion) speak(currentQuestion.text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.questionId]);

  useEffect(() => {
    if (isListening) queueMicrotask(() => setAnswer(transcript));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      if (error) setError('');
      startListening();
    }
  };

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
        err instanceof ApiError
          ? { message: err.message, code: err.status }
          : { message: 'AI 평가 요청에 실패했어요.' },
      );
      setEvaluationStatus('failed');
    } finally {
      evaluatingRef.current = false;
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }
    if (!data.sessionId || !currentQuestion) return;

    if (isListening) stopListening();
    setError('');
    setIsSubmitting(true);
    try {
      const submittedAnswer = await submitAnswer(data.sessionId, currentQuestion.questionId, { answerText: answer });

      if (isIntroQuestion) {
        const firstProjectQuestion = await generateQuestion(data.sessionId);
        setQuestions((prev) => [...prev, toQuestionItem(firstProjectQuestion)]);
        setCurrentIndex((prev) => prev + 1);
        setAnswer('');
        setIsHintOpen(false);
        return;
      }

      if (isLastQuestion) {
        await runEvaluation(data.sessionId);
        return;
      }

      const nextQuestion = await generateNextQuestion(
        data.sessionId, currentQuestion.questionId, submittedAnswer.answerId,
      );
      setQuestions((prev) => [...prev, toQuestionItem(nextQuestion)]);
      setCurrentIndex((prev) => prev + 1);
      setAnswer('');
      setIsHintOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '답변 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (evaluationStatus === 'evaluating') {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-7 h-16 w-16 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
        <div className="mb-2 text-lg font-bold text-ink">면접 결과를 분석하고 있어요</div>
        <p className="mb-8 max-w-[320px] text-sm leading-relaxed text-muted">
          답변을 바탕으로 AI 피드백을 생성하고 있어요. 잠시만 기다려주세요.
        </p>

        <div className="w-[300px] text-left">
          <div className="flex items-center gap-2.5 border-b border-dashed border-stroke py-2.5">
            <i className="ti ti-circle-check-filled text-base text-brand" aria-hidden="true" />
            <span className="text-[13px] text-[#3A3355]">답변 저장 완료</span>
          </div>
          <div className="flex items-center gap-2.5 border-b border-dashed border-stroke py-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2DEF5] border-t-brand" />
            <span className="text-[13px] text-[#3A3355]">역량별 점수 산출 중</span>
          </div>
          <div className="flex items-center gap-2.5 py-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2DEF5] border-t-brand" />
            <span className="text-[13px] text-[#3A3355]">AI 총평 생성 중</span>
          </div>
        </div>

        <div className="mt-7 text-[11.5px] text-muted">보통 10~20초 정도 걸려요. 이 화면을 닫지 말아주세요.</div>
      </div>
    );
  }

  if (evaluationStatus === 'failed' && data.sessionId) {
    const sessionId = data.sessionId;
    return (
      <ErrorState
        title="면접 결과를 분석하지 못했어요"
        description={`${evaluationError?.message ?? 'AI 평가 요청에 실패했어요.'} 답변은 모두 저장되어 있어요. 다시 시도하면 평가만 다시 요청해요.`}
        code={evaluationError?.code}
        onRetry={() => runEvaluation(sessionId)}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="mb-4 max-w-[280px] text-sm text-red-500">
          {error || '질문을 불러오는 중이에요...'}
        </p>
        {error && (
          <button
            type="button"
            onClick={() => navigate('/interview/setup')}
            className="rounded-lg border border-stroke px-5 py-2.5 text-sm text-[#3A3355]"
          >
            ← 이전으로 돌아가기
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 flex items-center gap-2.5">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="whitespace-nowrap text-xs font-semibold text-muted">
          {isIntroQuestion ? '자기소개' : `질문 ${currentProjectQuestionIndex + 1} / ${data.questionCount}`}
        </div>
        <button
          type="button"
          onClick={() => setIsExitModalOpen(true)}
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#FDEEEF] px-3 py-2 text-xs font-semibold text-[#B5495A]"
        >
          <i className="ti ti-x text-sm" aria-hidden="true" />
          면접 종료
        </button>
      </div>

      <div className="mb-8 flex items-start gap-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8F6FF0] text-white">
          <i className="ti ti-robot text-lg" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
            AI 면접관
            {isIntroQuestion && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">자기소개</span>
            )}
            {isFollowUpQuestion && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">꼬리질문</span>
            )}
            <button
              type="button"
              onClick={() => speak(currentQuestion.text)}
              disabled={isSpeaking}
              className="text-brand disabled:opacity-50"
            >
              <i className="ti ti-volume text-sm" aria-hidden="true" /> 다시 듣기
            </button>
            <span className="ml-auto flex items-center gap-1" role="group" aria-label="면접관 목소리 선택">
              {(['male', 'female'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  aria-pressed={voiceGender === gender}
                  onClick={() => {
                    setVoiceGender(gender);
                    speak(currentQuestion.text);
                  }}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    voiceGender === gender ? 'border-brand bg-card text-brand' : 'border-stroke text-muted'
                  }`}
                >
                  {gender === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </span>
          </div>
          {voiceGenderNote && (
            <p className="mb-2 text-[11px] font-medium leading-relaxed text-muted">{voiceGenderNote}</p>
          )}
          <div className="rounded-[20px] rounded-tl-md bg-card px-5 py-4 text-[15px] leading-[1.75] text-ink">
            {currentQuestion.text}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsHintOpen((prev) => !prev)}
        className="mb-3.5 inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-brand bg-white px-3.5 py-2 text-xs font-bold text-brand"
      >
        <i className="ti ti-bulb text-sm" aria-hidden="true" />
        힌트 받기
      </button>

      {isHintOpen && (
        <div className="mb-4 rounded-2xl border-[1.5px] border-stroke bg-canvas px-4 py-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-brand">
            <i className="ti ti-bulb text-sm" aria-hidden="true" />
            답변 힌트
          </div>
          <p className="text-xs leading-relaxed text-muted">아직 준비된 힌트가 없어요.</p>
        </div>
      )}

      <textarea
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          if (error) setError('');
        }}
        placeholder="답변을 입력하거나 마이크 버튼을 눌러 말로 답변하세요"
        rows={5}
        className="mb-1 w-full resize-none rounded-2xl border-[1.5px] border-stroke px-5 py-4 text-[15px] leading-relaxed text-ink placeholder:text-[#B6AED8] focus:border-brand focus:outline-none"
      />
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {sttError && <p className="mb-2 text-xs text-red-500">{sttError}</p>}

      <div className="mb-8 mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!!sttError}
          className={`flex items-center gap-2 rounded-xl border-[1.5px] px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
            isListening ? 'border-brand bg-card text-brand' : 'border-stroke text-[#3A3355]'
          }`}
        >
          <i className="ti ti-microphone text-base" aria-hidden="true" />
          {isListening ? '녹음 중지' : '음성으로 답변'}
        </button>
        <button
          type="button"
          onClick={handleSubmitAnswer}
          disabled={isSubmitting}
          className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? '제출 중...' : '답변 제출'}
        </button>
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
