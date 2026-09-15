package com.interview.backend.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "job_position")
    private String jobPosition;

    @Lob
    @Column(name = "parsed_text")
    private String parsedText;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Project() {
    }

    public Project(Long userId, String title, String jobPosition) {
        this.userId = userId;
        this.title = title;
        this.jobPosition = jobPosition;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getJobPosition() {
        return jobPosition;
    }

    public String getParsedText() {
        return parsedText;
    }

    public void setParsedText(String parsedText) {
        this.parsedText = parsedText;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
