package com.interview.backend.resume;

import com.interview.backend.resume.dto.ResumeResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @GetMapping
    public ResponseEntity<List<ResumeResponse>> getMyResumes(Authentication authentication) {
        return ResponseEntity.ok(resumeService.getMyResumes(authentication.getName()));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeResponse> upload(
            Authentication authentication,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(resumeService.upload(authentication.getName(), file));
    }

    @PutMapping(value = "/{resumeId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeResponse> replace(
            Authentication authentication,
            @PathVariable Long resumeId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(resumeService.replace(authentication.getName(), resumeId, file));
    }

    @DeleteMapping("/{resumeId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long resumeId) {
        resumeService.delete(authentication.getName(), resumeId);
        return ResponseEntity.noContent().build();
    }
}
