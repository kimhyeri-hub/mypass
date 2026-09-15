package com.interview.backend.ai;

import com.interview.backend.document.service.PdfService;
import com.interview.backend.project.Project;
import com.interview.backend.project.ProjectRepository;
import com.interview.backend.project.ProjectService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiInterviewServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AiService aiService;

    // PdfService has no external dependencies, so a real instance is used instead
    // of a Mockito mock (mocking concrete classes is broken on this JDK).
    private final PdfService pdfService = new PdfService();

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    private ProjectService projectService() {
        return new ProjectService(projectRepository, userRepository, pdfService);
    }

    @Test
    void generatesQuestionFromProjectParsedText() {
        Project project = new Project(1L, "Mypass", "Backend");
        project.setParsedText("Spring Boot와 MariaDB로 만든 면접 서비스");
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
        when(aiService.generateQuestion(contains("Spring Boot와 MariaDB로 만든 면접 서비스")))
                .thenReturn("Spring Boot를 선택한 이유는 무엇인가요?");

        AiInterviewService aiInterviewService = new AiInterviewService(projectService(), aiService);
        String question = aiInterviewService.generateQuestion("a@example.com", 10L);

        assertThat(question).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
    }

    @Test
    void rejectsWhenProjectHasNoParsedText() {
        Project project = new Project(1L, "Mypass", "Backend");
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));

        AiInterviewService aiInterviewService = new AiInterviewService(projectService(), aiService);

        assertThatThrownBy(() -> aiInterviewService.generateQuestion("a@example.com", 10L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
