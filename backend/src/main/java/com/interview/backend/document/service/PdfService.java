package com.interview.backend.document.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Service
public class PdfService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";

    public String extractText(MultipartFile file) throws IOException {
        validate(file);

        try (InputStream inputStream = file.getInputStream();
             PDDocument document = PDDocument.load(inputStream)) {

            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드된 파일이 비어 있습니다.");
        }

        String filename = file.getOriginalFilename();
        boolean isPdfContentType = PDF_CONTENT_TYPE.equals(file.getContentType());
        boolean isPdfExtension = filename != null && filename.toLowerCase().endsWith(".pdf");

        if (!isPdfContentType && !isPdfExtension) {
            throw new IllegalArgumentException("PDF 파일만 업로드할 수 있습니다.");
        }
    }
}
