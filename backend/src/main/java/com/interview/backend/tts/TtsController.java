package com.interview.backend.tts;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tts")
public class TtsController {

    private static final Logger log = LoggerFactory.getLogger(TtsController.class);

    private final TtsService ttsService;

    public TtsController(TtsService ttsService) {
        this.ttsService = ttsService;
    }

    @PostMapping
    public ResponseEntity<byte[]> speak(@RequestBody TtsRequest request) {
        String text = TtsService.cleanText(request.text());
        if (text.isEmpty() || text.length() > 600) {
            return ResponseEntity.badRequest().build();
        }
        try {
            byte[] audio = ttsService.synthesize(text, request.voice());
            return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/mpeg")).body(audio);
        } catch (Exception e) {
            log.error("TTS 음성 생성 실패: {}", e.toString(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
