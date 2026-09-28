import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const questions = useMemo(
    () => getDummyQuestions(data.projectName, data.questionCount),
    [data.projectName, data.questionCount],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  const handleToggleRecording = () => {
    // TODO: 실제 음성 녹음/STT 연동 자리
    setIsRecording((prev) => !prev);
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      setError('답변을 입력하거나 음성으로 답변해 주세요.');
      return;
    }

    setError('');
    // TODO: 백엔드에 답변을 제출하고, 꼬리질문 여부를 응답받아 분기 처리합니다.

    if (isLastQuestion) {
      navigate('/interview/result');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setAnswer('');
    setIsRecording(false);
  };

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
          질문 {currentIndex + 1} / {questions.length}
        </div>
      </div>

      <div className="mb-8 flex items-start gap-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8F6FF0] text-white">
          <i className="ti ti-robot text-lg" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="mb-2 text-xs font-semibold text-muted">AI 면접관</div>
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
        className="mb-1 w-full resize-none rounded-2xl border-[1.5px] border-stroke px-5 py-4 text-[15px] leading-relaxed text-ink placeholder:text-[#B6AED8] focus:border-brand focus:outline-none"
      />
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleToggleRecording}
          className={`flex items-center gap-2 rounded-xl border-[1.5px] px-5 py-3 text-sm font-semibold transition-colors ${
            isRecording ? 'border-brand bg-card text-brand' : 'border-stroke text-[#3A3355]'
          }`}
        >
          <i className="ti ti-microphone text-base" aria-hidden="true" />
          {isRecording ? '녹음 중지' : '음성으로 답변'}
        </button>
        <button
          type="button"
          onClick={handleSubmitAnswer}
          className="rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] transition-colors hover:bg-brand-dark"
        >
          답변 제출
        </button>
      </div>
    </div>
  );
}
