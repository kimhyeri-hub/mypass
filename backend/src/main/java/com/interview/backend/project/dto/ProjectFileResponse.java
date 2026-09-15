package com.interview.backend.project.dto;

import com.interview.backend.project.ProjectFile;

import java.time.LocalDateTime;

public record ProjectFileResponse(
        Long fileId,
        String originalName,
        String fileType,
        LocalDateTime uploadedAt
) {
    public static ProjectFileResponse from(ProjectFile file) {
        return new ProjectFileResponse(
                file.getFileId(),
                file.getOriginalName(),
                file.getFileType(),
                file.getUploadedAt()
        );
    }
}
