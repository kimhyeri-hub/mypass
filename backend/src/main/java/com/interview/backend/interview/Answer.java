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
@Table(name = "answers")
@Getter
@Setter
@NoArgsConstructor
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "answer_id")
    private Long answerId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "attempt_no", nullable = false)
    private Integer attemptNo;

    @Column(name = "is_final", nullable = false)
    private Boolean isFinal;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "duration_sec")
    private Integer durationSec;

    // 아래 분석 관련 점수들은 AI/RAG 쪽에서 채워줄 필드 (지금은 항상 비어있음)
    @Column(name = "gaze_stability_score")
    private Float gazeStabilityScore;

    @Column(name = "voice_tremor_score")
    private Float voiceTremorScore;

    @Column(name = "speaking_rate_wpm")
    private Float speakingRateWpm;

    @Column(name = "filler_word_count")
    private Integer fillerWordCount;

    @Column(name = "relevance_score")
    private Float relevanceScore;

    @Column(name = "clarity_score")
    private Float clarityScore;

    @Column(name = "feedback_text", columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "answered_at", updatable = false)
    private LocalDateTime answeredAt;

    public Answer(Long questionId, Integer attemptNo, String answerText, String audioUrl, String videoUrl, Integer durationSec) {
        this.questionId = questionId;
        this.attemptNo = attemptNo;
        this.isFinal = true;
        this.answerText = answerText;
        this.audioUrl = audioUrl;
        this.videoUrl = videoUrl;
        this.durationSec = durationSec;
    }

    @PrePersist
    protected void onCreate() {
        this.answeredAt = LocalDateTime.now();
    }
}
