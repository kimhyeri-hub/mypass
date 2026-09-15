package com.interview.backend.ai;

import com.interview.backend.ai.dto.QuestionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class AiInterviewController {

    private final AiInterviewService aiInterviewService;

    public AiInterviewController(AiInterviewService aiInterviewService) {
        this.aiInterviewService = aiInterviewService;
    }

    @PostMapping("/{id}/questions")
    public ResponseEntity<QuestionResponse> generateQuestion(
            @AuthenticationPrincipal String email,
            @PathVariable Long id) {
        String question = aiInterviewService.generateQuestion(email, id);
        return ResponseEntity.ok(new QuestionResponse(question));
    }
}
