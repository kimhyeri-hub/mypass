package com.interview.backend.document.controller;

import com.interview.backend.document.service.PdfService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/test/document")
public class DocumentTestController {

    private final PdfService pdfService;

    public DocumentTestController(PdfService pdfService) {
        this.pdfService = pdfService;
    }

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> extractText(@RequestParam("file") MultipartFile file) {
        try {
            String extractedText = pdfService.extractText(file);
            return ResponseEntity.ok(extractedText);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("PDF 파싱 중 오류 발생: " + e.getMessage());
        }
    }
}