package com.interview.backend.document.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfServiceTest {

    private final PdfService pdfService = new PdfService();

    @Test
    void extractsTextFromValidPdf() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/test-files/sample.pdf")) {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "sample.pdf", "application/pdf", in.readAllBytes());

            String text = pdfService.extractText(file);

            assertThat(text).contains("Hello PDF");
        }
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> pdfService.extractText(file))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNonPdfFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "just text".getBytes());

        assertThatThrownBy(() -> pdfService.extractText(file))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
