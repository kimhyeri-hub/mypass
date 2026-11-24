package com.interview.backend.resume;

import com.interview.backend.resume.dto.ResumeResponse;
import com.interview.backend.storage.FileStorageService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ResumeService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx");

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            FileStorageService fileStorageService
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    public List<ResumeResponse> getMyResumes(String userEmail) {
        User user = getUser(userEmail);
        return resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(user.getUserId()).stream()
                .map(ResumeResponse::from)
                .toList();
    }

    @Transactional
    public ResumeResponse upload(String userEmail, MultipartFile file) {
        User user = getUser(userEmail);
        String extension = validateFile(file);

        String storageKey = fileStorageService.store(file);
        String originalName = originalNameOf(file);

        Resume resume = new Resume(
                user.getUserId(),
                titleOf(originalName),
                originalName,
                extension.toUpperCase(Locale.ROOT),
                file.getSize(),
                storageKey
        );
        // 처음 올린 이력서가 기본 이력서가 된다.
        resume.setDefault(resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(user.getUserId()).isEmpty());

        try {
            resumeRepository.save(resume);
        } catch (RuntimeException e) {
            // DB 저장에 실패했는데 파일만 남지 않도록 방금 저장한 파일을 지운다.
            fileStorageService.delete(storageKey);
            throw e;
        }
        return ResumeResponse.from(resume);
    }

    @Transactional
    public ResumeResponse replace(String userEmail, Long resumeId, MultipartFile file) {
        User user = getUser(userEmail);
        Resume resume = getOwnedResume(user, resumeId);
        String extension = validateFile(file);

        String oldStorageKey = resume.getStorageKey();
        String newStorageKey = fileStorageService.store(file);
        String originalName = originalNameOf(file);

        resume.setTitle(titleOf(originalName));
        resume.setOriginalName(originalName);
        resume.setFileType(extension.toUpperCase(Locale.ROOT));
        resume.setFileSize(file.getSize());
        resume.setStorageKey(newStorageKey);
        resume.setUploadedAt(java.time.LocalDateTime.now());

        try {
            resumeRepository.save(resume);
        } catch (RuntimeException e) {
            fileStorageService.delete(newStorageKey);
            throw e;
        }
        fileStorageService.delete(oldStorageKey);
        return ResumeResponse.from(resume);
    }

    @Transactional
    public void delete(String userEmail, Long resumeId) {
        User user = getUser(userEmail);
        Resume resume = getOwnedResume(user, resumeId);
        boolean wasDefault = resume.isDefault();
        String storageKey = resume.getStorageKey();

        resumeRepository.delete(resume);
        fileStorageService.delete(storageKey);

        // 기본 이력서를 지웠다면 남은 것 중 가장 먼저 올린 이력서를 기본으로 올린다.
        if (wasDefault) {
            resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(user.getUserId()).stream()
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefault(true);
                        resumeRepository.save(next);
                    });
        }
    }

    private String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일을 선택해 주세요.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 크기는 10MB를 넘을 수 없어요.");
        }
        String name = originalNameOf(file);
        int dot = name.lastIndexOf('.');
        String extension = dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF, DOC, DOCX 파일만 올릴 수 있어요.");
        }
        return extension;
    }

    private String originalNameOf(MultipartFile file) {
        String name = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        return StringUtils.hasText(name) ? name : "이력서";
    }

    private String titleOf(String originalName) {
        int dot = originalName.lastIndexOf('.');
        String title = dot > 0 ? originalName.substring(0, dot) : originalName;
        return title.length() > 255 ? title.substring(0, 255) : title;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }

    private Resume getOwnedResume(User user, Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "이력서를 찾을 수 없습니다."));
        if (!resume.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 이력서만 접근할 수 있습니다.");
        }
        return resume;
    }
}
