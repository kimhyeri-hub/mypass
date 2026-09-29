// TODO: 백엔드 연동 시 이 더미 질문 목록 대신, 프로젝트 정보를 넘겨 생성된 질문 목록을 API로 받아옵니다.
export function getDummyQuestions(projectName: string, questionCount: number): string[] {
  const projectLabel = projectName || '진행하신 프로젝트';
  const all = [
    `${projectLabel}에서 프론트엔드를 맡으셨다고 되어있는데, 가장 구현하기 어려웠던 화면이나 기능이 있었다면 무엇이었나요?`,
    '그 문제를 해결하기 위해 어떤 방법들을 고려했고, 최종적으로 어떤 방법을 선택했나요?',
    '팀원과 기술적으로 의견이 달랐던 경험이 있다면 어떻게 해결했는지 설명해 주세요.',
  ];
  return all.slice(0, Math.max(1, Math.min(questionCount, all.length)));
}
