package com.interview.backend.resume;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * 사용자가 "내 이력서 관리"에서 올려 둔 이력서 파일.
 * 면접 때 프로젝트 자료로 올리는 project_files와는 별개로, 계정에 계속 남겨 두는 목록이다.
 */
@Entity
@Table(name = "resumes")
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "resume_id")
    private Long resumeId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    // PDF, DOC, DOCX 같은 확장자 대문자 표기
    @Column(name = "file_type", length = 20)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    // 로컬/서버 디스크에 저장된 파일 key. 나중에 S3로 넘어가면 S3 key가 그대로 들어간다.
    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    public Resume() {
    }

    public Resume(Long userId, String title, String originalName, String fileType, Long fileSize, String storageKey) {
        this.userId = userId;
        this.title = title;
        this.originalName = originalName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.storageKey = storageKey;
    }

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
    }

    public Long getResumeId() {
        return resumeId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
