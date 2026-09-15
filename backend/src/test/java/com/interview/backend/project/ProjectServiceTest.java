package com.interview.backend.project;

import com.interview.backend.document.service.PdfService;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.storage.FileStorageService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectFileRepository projectFileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileStorageService fileStorageService;

    // PdfService has no external dependencies, so a real instance is used instead
    // of a Mockito mock (mocking concrete classes is broken on this JDK).
    private final PdfService pdfService = new PdfService();

    private ProjectService projectService() {
        return new ProjectService(projectRepository, projectFileRepository, userRepository, fileStorageService, pdfService);
    }

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    @Test
    void extractsAndStoresTextForUploadedPdf() throws IOException {
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(fileStorageService.store(any())).thenReturn("stored-key");

        ArgumentCaptor<ProjectFile> savedFile = ArgumentCaptor.forClass(ProjectFile.class);
        when(projectFileRepository.save(savedFile.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        try (InputStream in = getClass().getResourceAsStream("/test-files/sample.pdf")) {
            MockMultipartFile file = new MockMultipartFile(
                    "files", "sample.pdf", "application/pdf", in.readAllBytes());

            ProjectResponse response = projectService().createProject(
                    "a@example.com", "Mypass", null, null, null, null, null, List.of(file));

            assertThat(response.title()).isEqualTo("Mypass");
            assertThat(savedFile.getValue().getExtractedText()).contains("Hello PDF");
        }
    }

    @Test
    void doesNotFailProjectCreationWhenPdfParsingFails() {
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(fileStorageService.store(any())).thenReturn("stored-key");

        ArgumentCaptor<ProjectFile> savedFile = ArgumentCaptor.forClass(ProjectFile.class);
        when(projectFileRepository.save(savedFile.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        // Not a real PDF, but passes the filename/content-type check - PdfService will throw while parsing it.
        MockMultipartFile brokenFile = new MockMultipartFile(
                "files", "broken.pdf", "application/pdf", new byte[]{1, 2, 3});

        ProjectResponse response = projectService().createProject(
                "a@example.com", "Mypass", null, null, null, null, null, List.of(brokenFile));

        assertThat(response.title()).isEqualTo("Mypass");
        assertThat(savedFile.getValue().getExtractedText()).isNull();
    }
}
