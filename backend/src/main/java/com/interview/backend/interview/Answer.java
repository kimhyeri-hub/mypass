package com.interview.backend.interview;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "answers")
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

    public Answer() {
    }

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

    public Long getAnswerId() {
        return answerId;
    }

    public void setAnswerId(Long answerId) {
        this.answerId = answerId;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public Integer getAttemptNo() {
        return attemptNo;
    }

    public void setAttemptNo(Integer attemptNo) {
        this.attemptNo = attemptNo;
    }

    public Boolean getIsFinal() {
        return isFinal;
    }

    public void setIsFinal(Boolean isFinal) {
        this.isFinal = isFinal;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public String getAudioUrl() {
        return audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public Integer getDurationSec() {
        return durationSec;
    }

    public void setDurationSec(Integer durationSec) {
        this.durationSec = durationSec;
    }

    public Float getGazeStabilityScore() {
        return gazeStabilityScore;
    }

    public void setGazeStabilityScore(Float gazeStabilityScore) {
        this.gazeStabilityScore = gazeStabilityScore;
    }

    public Float getVoiceTremorScore() {
        return voiceTremorScore;
    }

    public void setVoiceTremorScore(Float voiceTremorScore) {
        this.voiceTremorScore = voiceTremorScore;
    }

    public Float getSpeakingRateWpm() {
        return speakingRateWpm;
    }

    public void setSpeakingRateWpm(Float speakingRateWpm) {
        this.speakingRateWpm = speakingRateWpm;
    }

    public Integer getFillerWordCount() {
        return fillerWordCount;
    }

    public void setFillerWordCount(Integer fillerWordCount) {
        this.fillerWordCount = fillerWordCount;
    }

    public Float getRelevanceScore() {
        return relevanceScore;
    }

    public void setRelevanceScore(Float relevanceScore) {
        this.relevanceScore = relevanceScore;
    }

    public Float getClarityScore() {
        return clarityScore;
    }

    public void setClarityScore(Float clarityScore) {
        this.clarityScore = clarityScore;
    }

    public String getFeedbackText() {
        return feedbackText;
    }

    public void setFeedbackText(String feedbackText) {
        this.feedbackText = feedbackText;
    }

    public LocalDateTime getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(LocalDateTime answeredAt) {
        this.answeredAt = answeredAt;
    }
}
