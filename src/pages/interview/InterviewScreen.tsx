import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  // TODO: 백엔드 연동 시 이 더미 질문 목록 대신, 프로젝트 정보를 넘겨 생성된 질문 목록을 API로 받아옵니다.
  const questions = useMemo(() => {
    const projectLabel = data.projectName || '진행하신 프로젝트';
    return [
      `${projectLabel}에서 프론트엔드를 맡으셨다고 되어있는데, 가장 구현하기 어려웠던 화면이나 기능이 있었다면 무엇이었나요?`,
      '그 문제를 해결하기 위해 어떤 방법들을 고려했고, 최종적으로 어떤 방법을 선택했나요?',
      '팀원과 기술적으로 의견이 달랐던 경험이 있다면 어떻게 해결했는지 설명해 주세요.',
    ].slice(0, Math.max(1, Math.min(data.questionCount, 3)));
  }, [data.projectName, data.questionCount]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

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
      navigate('/mypage');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setAnswer('');
    setIsRecording(false);
  };

  return (
    <div className="mx-auto max-w-[580px] px-10 pb-2 pt-10">
      <div className="mb-8 text-right text-xs text-[#98A2B3]">
        질문 {currentIndex + 1} / {questions.length}
      </div>

      <div className="mb-9 flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-card">
          <i className="ti ti-robot text-xl text-brand" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="mb-2 text-xs text-[#98A2B3]">AI 면접관</div>
          <div className="max-w-[460px] rounded-3xl rounded-tl-md bg-card px-6 py-5 text-[15px] leading-[1.8] text-ink">
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
          className="rounded-xl bg-brand px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          답변 제출
        </button>
      </div>
    </div>
  );
}
