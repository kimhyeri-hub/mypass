package com.interview.backend.interview;

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
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id")
    private Long questionId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "parent_question_id")
    private Long parentQuestionId;

    @Column(name = "sequence_no")
    private Integer sequenceNo;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "question_type")
    private String questionType;

    @Column(name = "tts_audio_url")
    private String ttsAudioUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Question(Long sessionId, Long parentQuestionId, Integer sequenceNo, String questionText, String questionType, String ttsAudioUrl) {
        this.sessionId = sessionId;
        this.parentQuestionId = parentQuestionId;
        this.sequenceNo = sequenceNo;
        this.questionText = questionText;
        this.questionType = questionType;
        this.ttsAudioUrl = ttsAudioUrl;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
