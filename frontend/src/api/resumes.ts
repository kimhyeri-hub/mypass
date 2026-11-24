import { apiForm, apiGet, apiJson } from './client';

export interface ResumeResponse {
  resumeId: number;
  title: string;
  originalName: string;
  fileType: string | null;
  fileSize: number;
  isDefault: boolean;
  uploadedAt: string;
}

export function getMyResumes(): Promise<ResumeResponse[]> {
  return apiGet<ResumeResponse[]>('/api/resumes');
}

export function uploadResume(file: File): Promise<ResumeResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiForm<ResumeResponse>('POST', '/api/resumes', formData);
}

export function replaceResume(resumeId: number, file: File): Promise<ResumeResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiForm<ResumeResponse>('PUT', `/api/resumes/${resumeId}/file`, formData);
}

export async function deleteResume(resumeId: number): Promise<void> {
  await apiJson<void>('DELETE', `/api/resumes/${resumeId}`);
}
