package com.interview.backend.resume;

import com.interview.backend.resume.dto.ResumeResponse;
import com.interview.backend.storage.FileStorageService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeServiceTest {

    private static final String EMAIL = "tester@example.com";
    private static final Long USER_ID = 7L;

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileStorageService fileStorageService;

    private ResumeService resumeService;

    @BeforeEach
    void setUp() {
        resumeService = new ResumeService(resumeRepository, userRepository, fileStorageService);
        User user = new User(EMAIL, "hashed", "tester");
        user.setUserId(USER_ID);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    @Test
    void firstUploadBecomesDefaultResume() {
        when(fileStorageService.store(any())).thenReturn("key-1.pdf");
        when(resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(USER_ID)).thenReturn(List.of());
        when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResumeResponse response = resumeService.upload(EMAIL, pdf("내 이력서.pdf", 100));

        assertThat(response.isDefault()).isTrue();
        assertThat(response.title()).isEqualTo("내 이력서");
        assertThat(response.fileType()).isEqualTo("PDF");
        assertThat(response.fileSize()).isEqualTo(100L);
    }

    @Test
    void laterUploadIsNotDefault() {
        when(fileStorageService.store(any())).thenReturn("key-2.pdf");
        when(resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(USER_ID))
                .thenReturn(List.of(resume(1L, true)));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResumeResponse response = resumeService.upload(EMAIL, pdf("두번째.pdf", 100));

        assertThat(response.isDefault()).isFalse();
    }

    @Test
    void rejectsUnsupportedFileTypeWithoutStoringIt() {
        MockMultipartFile exe = new MockMultipartFile("file", "virus.exe", "application/octet-stream", new byte[]{1});

        assertThatThrownBy(() -> resumeService.upload(EMAIL, exe))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void rejectsFilesOverTenMegabytes() {
        MockMultipartFile big = new MockMultipartFile("file", "big.pdf", "application/pdf", new byte[10 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> resumeService.upload(EMAIL, big))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("10MB");
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void deletingDefaultResumePromotesTheOldestRemainingOne() {
        Resume defaultResume = resume(1L, true);
        Resume next = resume(2L, false);
        when(resumeRepository.findById(1L)).thenReturn(Optional.of(defaultResume));
        when(resumeRepository.findByUserIdOrderByUploadedAtAscResumeIdAsc(USER_ID)).thenReturn(new ArrayList<>(List.of(next)));

        resumeService.delete(EMAIL, 1L);

        verify(resumeRepository).delete(defaultResume);
        verify(fileStorageService).delete("key-1");
        ArgumentCaptor<Resume> saved = ArgumentCaptor.forClass(Resume.class);
        verify(resumeRepository).save(saved.capture());
        assertThat(saved.getValue().getResumeId()).isEqualTo(2L);
        assertThat(saved.getValue().isDefault()).isTrue();
    }

    @Test
    void cannotDeleteSomeoneElsesResume() {
        Resume other = new Resume(999L, "남의 것", "other.pdf", "PDF", 10L, "key-x");
        when(resumeRepository.findById(5L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> resumeService.delete(EMAIL, 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(resumeRepository, never()).delete(any(Resume.class));
        verify(fileStorageService, never()).delete(anyString());
    }

    private static MockMultipartFile pdf(String name, int size) {
        return new MockMultipartFile("file", name, "application/pdf", new byte[size]);
    }

    private static Resume resume(Long id, boolean isDefault) {
        Resume resume = new Resume(USER_ID, "이력서" + id, "r" + id + ".pdf", "PDF", 10L, "key-" + id);
        org.springframework.test.util.ReflectionTestUtils.setField(resume, "resumeId", id);
        resume.setDefault(isDefault);
        return resume;
    }
}
