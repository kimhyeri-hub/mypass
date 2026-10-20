import { useEffect, useRef, useState } from 'react';
import { fetchAnswerHint } from '../api/interview';
import { ApiError } from '../api/client';

export function useAnswerHint(sessionId: number | null, questionId: number | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const inFlight = useRef<number | null>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [questionId]);

  const toggle = () => {
    if (sessionId == null || questionId == null) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (hints[questionId] != null || inFlight.current === questionId) return;

    const requestedSessionId = sessionId;
    const requestedQuestionId = questionId;
    inFlight.current = requestedQuestionId;
    setLoadingId(requestedQuestionId);
    setErrors((prev) => {
      if (prev[requestedQuestionId] == null) return prev;
      const next = { ...prev };
      delete next[requestedQuestionId];
      return next;
    });

    void fetchAnswerHint(requestedSessionId, requestedQuestionId)
      .then((result) => {
        setHints((prev) => ({ ...prev, [requestedQuestionId]: result.hint }));
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError
          ? err.message
          : '힌트를 불러오지 못했어요. 면접은 계속 진행할 수 있어요.';
        setErrors((prev) => ({ ...prev, [requestedQuestionId]: message }));
      })
      .finally(() => {
        if (inFlight.current === requestedQuestionId) inFlight.current = null;
        setLoadingId((current) => (current === requestedQuestionId ? null : current));
      });
  };

  const hint = questionId == null ? undefined : hints[questionId];
  const error = questionId == null ? '' : (errors[questionId] ?? '');
  const isLoading = questionId != null && loadingId === questionId && hint == null;

  return { isOpen, toggle, hint, error, isLoading };
}
