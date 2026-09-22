import { useState } from "react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { fetchQuestion, submitAnswer, QuestionResponse } from "../../api/interviewApi";

interface Props {
  sessionId: string;
}

export function QuestionChat({ sessionId }: Props) {
  const { speak, isSpeaking } = useTextToSpeech();
  const { startListening, stopListening, isListening, transcript, error } = useSpeechToText();

  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const q = await fetchQuestion(sessionId);
      setQuestion(q);
      speak(q.questionText);
    } catch (e) {
      alert("질문을 받아오지 못했습니다. 백엔드 서버 상태를 확인하세요.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !transcript) {
      alert("답변을 먼저 녹음해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await submitAnswer(sessionId, {
        questionId: question.questionId,
        answerText: transcript,
      });

      setFeedback(
        `정확성 ${result.analysisResult.accuracy} / 논리성 ${result.analysisResult.logic} / 구체성 ${result.analysisResult.specificity}`
      );

      if (result.nextQuestionText) {
        const nextQ: QuestionResponse = {
          questionId: question.questionId + 1,
          questionText: result.nextQuestionText,
          questionType: result.isFollowUp ? "FOLLOW_UP" : "MAIN",
        };
        setQuestion(nextQ);
        speak(nextQ.questionText);
      } else {
        setQuestion(null);
      }
    } catch (e) {
      alert("답변 제출에 실패했습니다.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      {!question && (
        <button onClick={handleStart} disabled={isLoading}>
          ▶ 면접 시작
        </button>
      )}

      {question && (
        <>
          <div style={{ padding: 12, background: "#f0f4ff", borderRadius: 8, marginBottom: 12 }}>
            <strong>{question.questionText}</strong>
          </div>

          <button onClick={() => speak(question.questionText)} disabled={isSpeaking}>
            🔊 질문 다시 듣기
          </button>

          <button onClick={isListening ? stopListening : startListening}>
            {isListening ? "⏹ 답변 종료" : "🎙️ 답변 시작"}
          </button>

          <div style={{ margin: "12px 0", padding: 12, background: "#f7f7f7", borderRadius: 8 }}>
            {transcript || "답변 텍스트가 여기 표시됩니다"}
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button onClick={handleSubmit} disabled={isLoading || !transcript}>
            ✅ 답변 제출
          </button>
        </>
      )}

      {feedback && <p style={{ marginTop: 16, color: "#555" }}>이전 답변 분석: {feedback}</p>}
    </div>
  );
}
