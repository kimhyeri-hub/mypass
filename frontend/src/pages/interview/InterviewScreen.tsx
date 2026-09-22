import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { completeSession, generateQuestion, submitAnswer } from '../../api/interview';
import { ApiError } from '../../api/client';

interface QuestionItem {
  questionId: number;
  text: string;
}

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();
  const startedRef = useRef(false);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!data.sessionId || !data.firstQuestion) {
      queueMicrotask(() => setError('면접 세션을 찾을 수 없어요. 면접 설정부터 다시 진행해 주세요.'));
      return;
    }
    const { questionId, questionText } = data.firstQuestion;
    queueMicrotask(() => setQuestions([{ questionId, text: questionText }]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex + 1 >= data.questionCount;

  const handleToggleRecording = () => {
    // TODO: 실제 음성 녹음/STT 연동 자리
    setIsRecording((prev) => !prev);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }
    if (!data.sessionId || !currentQuestion) return;

    setError('');
    setIsSubmitting(true);
    try {
      await submitAnswer(data.sessionId, currentQuestion.questionId, { answerText: answer });

      if (isLastQuestion) {
        await completeSession(data.sessionId);
        navigate('/mypage');
        return;
      }

      const nextQuestion = await generateQuestion(data.sessionId);
      setQuestions((prev) => [...prev, { questionId: nextQuestion.questionId, text: nextQuestion.questionText }]);
      setCurrentIndex((prev) => prev + 1);
      setAnswer('');
      setIsRecording(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '답변 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center px-10 py-24 text-center">
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
    <div className="mx-auto max-w-[580px] px-10 pb-2 pt-10">
      <div className="mb-8 text-right text-xs text-[#98A2B3]">
        질문 {currentIndex + 1} / {data.questionCount}
      </div>

      <div className="mb-9 flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-card">
          <i className="ti ti-robot text-xl text-brand" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="mb-2 text-xs text-[#98A2B3]">AI 면접관</div>
          <div className="max-w-[460px] rounded-3xl rounded-tl-md bg-card px-6 py-5 text-[15px] leading-[1.8] text-ink">
            {currentQuestion.text}
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
        className="mb-1 w-full resize-none rounded-2xl border border-stroke px-5 py-4 text-[15px] leading-relaxed text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
      />
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="mb-8 mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleToggleRecording}
          className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm transition-colors ${
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
          className="rounded-xl bg-brand px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isSubmitting ? '제출 중...' : '답변 제출'}
        </button>
      </div>
    </div>
  );
}
