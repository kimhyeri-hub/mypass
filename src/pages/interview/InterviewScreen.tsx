import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';
import { next, submitAnswer, generateQuestion } from '../../api/interview';
import type { QuestionType } from '../../api/interview';
import ConfirmModal from '../../components/ConfirmModal';

interface CurrentQuestion {
  questionId: string;
  text: string;
  type: QuestionType;
}

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const targetTopicCount = data.questionCount;

  // 세션 생성(InterviewStarting) 단계에서 백엔드가 내려준 INTRO 질문을 그대로 첫 질문으로 사용합니다.
  // (세션 없이 이 화면에 바로 들어온 경우를 대비한 안전장치로, 그때만 로컬 문구로 대체합니다.)
  const [current, setCurrent] = useState<CurrentQuestion>(() =>
    data.firstQuestion
      ? {
          questionId: data.firstQuestion.questionId,
          text: data.firstQuestion.questionText,
          type: data.firstQuestion.questionType,
        }
      : { questionId: '', text: '간단한 자기소개 부탁드립니다.', type: 'INTRO' },
  );
  // INTRO는 questionCount에 포함하지 않으므로 0에서 시작하고, 첫 프로젝트 질문이 나올 때 1이 됩니다.
  const [mainTopicsAsked, setMainTopicsAsked] = useState(0);

  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const isIntro = current.type === 'INTRO';
  const progressPercent = isIntro ? 0 : (mainTopicsAsked / targetTopicCount) * 100;

  const handleToggleRecording = () => {
    // TODO: 실제 음성 녹음/STT 연동 자리
    setIsRecording((prev) => !prev);
  };

  const resetAnswerInputs = () => {
    setAnswer('');
    setIsRecording(false);
    setIsHintOpen(false);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (isIntro) {
        // INTRO 답변은 /next로 보내지 않고 submitAnswer()로만 제출한 뒤,
        // generateQuestion()으로 첫 프로젝트 질문(NEW_TOPIC)을 받아옵니다.
        if (data.sessionId && current.questionId) {
          await submitAnswer({
            sessionId: data.sessionId,
            questionId: current.questionId,
            answer,
          });
          const generated = await generateQuestion(data.sessionId);
          setCurrent({
            questionId: generated.questionId,
            text: generated.questionText,
            type: generated.questionType,
          });
          if (generated.questionType === 'NEW_TOPIC') {
            setMainTopicsAsked(1);
          }
        } else {
          // TODO: 세션 없이 테스트할 때만 쓰는 대체 경로입니다. 세션 연동이 끝나면 이 분기는 제거해도 됩니다.
          const fallbackFirst =
            getDummyQuestions(data.projectName, targetTopicCount)[0] ??
            '프로젝트에서 맡으신 역할에 대해 말씀해 주세요.';
          setCurrent({ questionId: '', text: fallbackFirst, type: 'NEW_TOPIC' });
          setMainTopicsAsked(1);
        }

        resetAnswerInputs();
        return;
      }

      // INTRO 이후의 실제 면접 질문은 기존 /next 흐름을 그대로 사용합니다.
      // 마지막 주제에 대한 답변도 기록을 위해 백엔드로 제출합니다.
      const res = await next({
        answer,
        interviewId: data.sessionId || undefined,
        questionId: current.questionId || undefined,
      });

      if (mainTopicsAsked >= targetTopicCount) {
        navigate('/interview/result');
        return;
      }

      setCurrent({ questionId: '', text: res.question, type: res.type });
      if (res.type === 'NEW_TOPIC') {
        setMainTopicsAsked((prev) => prev + 1);
      }
      resetAnswerInputs();
    } catch (err) {
      setError('다음 질문을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-7 flex items-center gap-2.5">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="whitespace-nowrap text-xs font-semibold text-muted">
          {isIntro
            ? '자기소개'
            : `주제 ${Math.min(mainTopicsAsked, targetTopicCount)} / ${targetTopicCount}`}
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
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            AI 면접관
            {isIntro && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">
                자기소개
              </span>
            )}
            {current.type === 'FOLLOW_UP' && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">
                꼬리질문
              </span>
            )}
          </div>
          <div className="rounded-[20px] rounded-tl-md bg-card px-5 py-4 text-[15px] leading-[1.75] text-ink">
            {current.text}
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
          {/* TODO: 백엔드 연동 시 이 자리에 실제 힌트 텍스트를 받아와 표시합니다. 지금은 더미 텍스트 없이 빈 상태만 보여줘요. */}
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
        disabled={isSubmitting}
        className="mb-1 w-full resize-none rounded-2xl border-[1.5px] border-stroke px-5 py-4 text-[15px] leading-relaxed text-ink placeholder:text-[#B6AED8] focus:border-brand focus:outline-none disabled:opacity-60"
      />
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={isSubmitting}
          className={`flex items-center gap-2 rounded-xl border-[1.5px] px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
            isRecording ? 'border-brand bg-card text-brand' : 'border-stroke text-[#3A3355]'
          }`}
        >
          <i className="ti ti-microphone text-base" aria-hidden="true" />
          {isRecording ? '녹음 중지' : '음성으로 답변'}
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
