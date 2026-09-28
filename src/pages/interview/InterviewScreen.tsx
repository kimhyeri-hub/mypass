import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';
import { next } from '../../api/interview';

interface AskedQuestion {
  text: string;
  isFollowUp: boolean;
}

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const targetTopicCount = data.questionCount;

  // 첫 질문은 아직 백엔드에 질문 생성 API가 없어 더미 질문을 사용합니다.
  // TODO: 첫 질문도 생성 API가 준비되면 이 부분을 API 호출로 교체합니다.
  const [questions, setQuestions] = useState<AskedQuestion[]>(() => {
    const first =
      getDummyQuestions(data.projectName, targetTopicCount)[0] ?? '자기소개를 간단히 부탁드려요.';
    return [{ text: first, isFollowUp: false }];
  });
  const [mainTopicsAsked, setMainTopicsAsked] = useState(1);

  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentIndex = questions.length - 1;
  const currentQuestion = questions[currentIndex].text;
  const isFollowUpQuestion = questions[currentIndex].isFollowUp;
  const progressPercent = (mainTopicsAsked / targetTopicCount) * 100;

  const handleToggleRecording = () => {
    // TODO: 실제 음성 녹음/STT 연동 자리
    setIsRecording((prev) => !prev);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // 마지막 주제에 대한 답변도 기록을 위해 백엔드로 제출합니다.
      const res = await next({ answer });

      if (mainTopicsAsked >= targetTopicCount) {
        navigate('/interview/result');
        return;
      }

      setQuestions((prev) => [...prev, { text: res.question, isFollowUp: res.type === 'FOLLOW_UP' }]);
      if (res.type === 'NEW_TOPIC') {
        setMainTopicsAsked((prev) => prev + 1);
      }
      setAnswer('');
      setIsRecording(false);
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
          주제 {Math.min(mainTopicsAsked, targetTopicCount)} / {targetTopicCount}
        </div>
      </div>

      <div className="mb-8 flex items-start gap-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8F6FF0] text-white">
          <i className="ti ti-robot text-lg" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            AI 면접관
            {isFollowUpQuestion && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-brand">
                꼬리질문
              </span>
            )}
          </div>
          <div className="rounded-[20px] rounded-tl-md bg-card px-5 py-4 text-[15px] leading-[1.75] text-ink">
            {currentQuestion}
          </div>
        </div>
      </div>

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
    </div>
  );
}
