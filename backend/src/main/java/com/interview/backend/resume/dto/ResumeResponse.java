package com.interview.backend.resume.dto;

import com.interview.backend.resume.Resume;

import java.time.LocalDateTime;

public record ResumeResponse(
        Long resumeId,
        String title,
        String originalName,
        String fileType,
        Long fileSize,
        boolean isDefault,
        LocalDateTime uploadedAt
) {
    public static ResumeResponse from(Resume resume) {
        return new ResumeResponse(
                resume.getResumeId(),
                resume.getTitle(),
                resume.getOriginalName(),
                resume.getFileType(),
                resume.getFileSize(),
                resume.isDefault(),
                resume.getUploadedAt()
        );
    }
}
