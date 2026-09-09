package com.interview.backend.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_files")
@Getter
@Setter
@NoArgsConstructor
public class ProjectFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long fileId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "file_type")
    private String fileType;

    // 로컬 단계에서는 로컬 저장 key, S3로 넘어가면 실제 S3 key가 그대로 이 컬럼에 들어간다.
    @Column(name = "s3_key")
    private String s3Key;

    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    public ProjectFile(Long projectId, String originalName, String fileType, String s3Key) {
        this.projectId = projectId;
        this.originalName = originalName;
        this.fileType = fileType;
        this.s3Key = s3Key;
    }

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }
}
