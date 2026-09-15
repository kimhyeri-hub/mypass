package com.interview.backend.project;

import com.interview.backend.document.service.PdfService;
import com.interview.backend.project.dto.ProjectCreateRequest;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    // PdfService has no external dependencies, so a real instance is used instead
    // of a Mockito mock (mocking concrete classes is broken on this JDK).
    private final PdfService pdfService = new PdfService();

    private ProjectService projectService;

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    @Test
    void createsProjectForCurrentUser() {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectResponse response = projectService.createProject(
                "a@example.com", new ProjectCreateRequest("Mypass", "Backend"));

        assertThat(response.title()).isEqualTo("Mypass");
        assertThat(response.jobPosition()).isEqualTo("Backend");
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void rejectsCreateWhenUserNotFound() {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.createProject(
                "missing@example.com", new ProjectCreateRequest("Mypass", "Backend")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void listsOnlyCurrentUsersProjects() {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(new Project(1L, "Mypass", "Backend")));

        List<ProjectResponse> projects = projectService.getMyProjects("a@example.com");

        assertThat(projects).hasSize(1);
        assertThat(projects.get(0).title()).isEqualTo("Mypass");
    }

    @Test
    void attachesParsedPdfTextToOwnedProject() throws IOException {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        Project project = new Project(1L, "Mypass", "Backend");

        try (InputStream in = getClass().getResourceAsStream("/test-files/sample.pdf")) {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "sample.pdf", "application/pdf", in.readAllBytes());

            when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
            when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
            when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ProjectResponse response = projectService.attachDocument("a@example.com", 10L, file);

            assertThat(response.title()).isEqualTo("Mypass");
            assertThat(project.getParsedText()).contains("Hello PDF");
        }
    }

    @Test
    void rejectsAttachDocumentWhenProjectBelongsToAnotherUser() {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        Project othersProject = new Project(2L, "Other", "Backend");
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", new byte[]{1});

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(10L)).thenReturn(Optional.of(othersProject));

        assertThatThrownBy(() -> projectService.attachDocument("a@example.com", 10L, file))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsGetOwnedProjectWhenProjectMissing() {
        projectService = new ProjectService(projectRepository, userRepository, pdfService);
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getOwnedProject("a@example.com", 99L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
