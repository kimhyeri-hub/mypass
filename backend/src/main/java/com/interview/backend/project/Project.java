package com.interview.backend.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // 아래 4개는 사용자가 프로젝트 등록 시 직접 입력하는 필드 (README 기획 기준)
    @Column(name = "tech_stack", columnDefinition = "TEXT")
    private String techStack;

    @Column(name = "role", columnDefinition = "TEXT")
    private String role;

    @Column(name = "main_features", columnDefinition = "TEXT")
    private String mainFeatures;

    @Column(name = "problem_solving", columnDefinition = "TEXT")
    private String problemSolving;

    // AI/RAG 쪽에서 문서 분석 후 채워 넣을 구조화 정보 (다른 팀원 담당, 지금은 항상 비어있음)
    @Column(name = "structured_info", columnDefinition = "json")
    private String structuredInfo;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Project() {
    }

    public Project(Long userId, String title, String description, String techStack, String role, String mainFeatures, String problemSolving) {
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.techStack = techStack;
        this.role = role;
        this.mainFeatures = mainFeatures;
        this.problemSolving = problemSolving;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTechStack() {
        return techStack;
    }

    public void setTechStack(String techStack) {
        this.techStack = techStack;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMainFeatures() {
        return mainFeatures;
    }

    public void setMainFeatures(String mainFeatures) {
        this.mainFeatures = mainFeatures;
    }

    public String getProblemSolving() {
        return problemSolving;
    }

    public void setProblemSolving(String problemSolving) {
        this.problemSolving = problemSolving;
    }

    public String getStructuredInfo() {
        return structuredInfo;
    }

    public void setStructuredInfo(String structuredInfo) {
        this.structuredInfo = structuredInfo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
