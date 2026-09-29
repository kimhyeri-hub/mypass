export interface ResumeItem {
  id: string;
  title: string;
  uploadedDate: string;
  fileType: string;
  sizeLabel: string;
  isDefault: boolean;
}

// TODO: 백엔드 연동 시 이 빈 배열 대신, 사용자가 업로드한 실제 이력서 목록을 API로 받아옵니다.
export const initialResumes: ResumeItem[] = [];
