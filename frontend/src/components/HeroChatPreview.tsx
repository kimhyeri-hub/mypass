import { useEffect, useState } from 'react';

interface ScriptLine {
  who: 'ai' | 'me';
  text: string;
  tag?: string;
}

// 홈 화면에서 면접이 어떻게 진행되는지 보여주는 예시 대화입니다. (실제 데이터 아님)
const SCRIPT: ScriptLine[] = [
  { who: 'ai', tag: '자기소개', text: '간단한 자기소개 부탁드립니다.' },
  { who: 'me', text: '안녕하세요, 백엔드 개발자를 꿈꾸는 김마패입니다.' },
  { who: 'ai', tag: '주제 1 / 5', text: '프로젝트에서 캐시를 도입한 이유가 무엇이었나요?' },
  { who: 'me', text: '조회 응답이 느려 Redis로 응답 시간을 줄였습니다.' },
  { who: 'ai', tag: '꼬리질문', text: '캐시와 DB 데이터가 어긋날 땐 어떻게 처리하셨나요?' },
];

interface ShownMessage {
  who: 'ai' | 'me';
  text: string;
  phase: 'wait' | 'type' | 'done';
}

export default function HeroChatPreview() {
  const [messages, setMessages] = useState<ShownMessage[]>([]);
  const [tag, setTag] = useState(SCRIPT[0].tag ?? '');

  useEffect(() => {
    // 타이핑 효과는 화면이 크게 움직이는 애니메이션이 아니라서,
    // 시스템의 "동작 줄이기" 설정과 상관없이 항상 재생합니다.
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      while (!cancelled) {
        setMessages([]);
        for (let i = 0; i < SCRIPT.length; i++) {
          const line = SCRIPT[i];
          if (line.tag) setTag(line.tag);
          setMessages((prev) => [...prev, { who: line.who, text: '', phase: 'wait' }]);
          await sleep(line.who === 'ai' ? 900 : 500);
          if (cancelled) return;

          for (let c = 1; c <= line.text.length; c++) {
            const partial = line.text.slice(0, c);
            setMessages((prev) =>
              prev.map((m, idx) => (idx === i ? { ...m, text: partial, phase: 'type' } : m)),
            );
            await sleep(line.who === 'ai' ? 32 : 26);
            if (cancelled) return;
          }

          setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, phase: 'done' } : m)));
          await sleep(1100);
          if (cancelled) return;
        }
        await sleep(2600);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="min-h-[400px] animate-rise rounded-3xl border border-stroke bg-white p-[22px] shadow-[0_30px_60px_-36px_rgba(30,18,64,0.3)]"
      style={{ animationDelay: '0.4s' }}
      aria-label="AI 면접 진행 예시"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-stroke pb-3.5 text-[13px] font-bold text-ink">
        <span className="h-[9px] w-[9px] animate-pulse-dot rounded-full bg-[#3DBE8B]" />
        AI 면접관
        <span className="ml-auto rounded-full bg-card px-2.5 py-[3px] text-[11px] text-brand">
          {tag}
        </span>
      </div>

      <div>
        {messages.map((message, index) => {
          const isAi = message.who === 'ai';
          return (
            <div
              key={index}
              className={`mb-3 max-w-[88%] animate-rise-fast rounded-2xl px-[15px] py-3 text-sm leading-relaxed ${
                isAi
                  ? 'rounded-bl-[4px] bg-card text-ink'
                  : 'ml-auto rounded-br-[4px] bg-brand text-white'
              }`}
            >
              <div className={`mb-[3px] text-[11px] font-bold ${isAi ? 'text-brand' : 'text-[#D9CFFF]'}`}>
                {isAi ? 'AI 면접관' : '나'}
              </div>
              {message.phase === 'wait' ? (
                <span className="inline-flex gap-1 py-0.5">
                  {[0, 150, 300].map((delay) => (
                    <i
                      key={delay}
                      className="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-brand"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <span>
                  {message.text}
                  {message.phase === 'type' && <span className="animate-blink">|</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
