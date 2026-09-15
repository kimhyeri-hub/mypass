package com.interview.backend.interview;

import com.interview.backend.interview.dto.AnswerResponse;
import com.interview.backend.interview.dto.CompleteSessionRequest;
import com.interview.backend.interview.dto.CreateAnswerRequest;
import com.interview.backend.interview.dto.CreateQuestionRequest;
import com.interview.backend.interview.dto.CreateSessionRequest;
import com.interview.backend.interview.dto.QuestionResponse;
import com.interview.backend.interview.dto.SessionResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class InterviewSessionController {

    private final InterviewSessionService sessionService;

    public InterviewSessionController(InterviewSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<SessionResponse> createSession(Authentication authentication, @Valid @RequestBody CreateSessionRequest request) {
        return ResponseEntity.ok(sessionService.createSession(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<SessionResponse>> getMySessions(Authentication authentication) {
        return ResponseEntity.ok(sessionService.getMySessions(authentication.getName()));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<SessionResponse> getSessionDetail(Authentication authentication, @PathVariable Long sessionId) {
        return ResponseEntity.ok(sessionService.getSessionDetail(authentication.getName(), sessionId));
    }

    @PostMapping("/{sessionId}/questions")
    public ResponseEntity<QuestionResponse> addQuestion(
            Authentication authentication,
            @PathVariable Long sessionId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        return ResponseEntity.ok(sessionService.addQuestion(authentication.getName(), sessionId, request));
    }

    @PostMapping("/{sessionId}/questions/{questionId}/answers")
    public ResponseEntity<AnswerResponse> addAnswer(
            Authentication authentication,
            @PathVariable Long sessionId,
            @PathVariable Long questionId,
            @RequestBody CreateAnswerRequest request
    ) {
        return ResponseEntity.ok(sessionService.addAnswer(authentication.getName(), sessionId, questionId, request));
    }

    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<SessionResponse> completeSession(
            Authentication authentication,
            @PathVariable Long sessionId,
            @RequestBody CompleteSessionRequest request
    ) {
        return ResponseEntity.ok(sessionService.completeSession(authentication.getName(), sessionId, request));
    }
}
