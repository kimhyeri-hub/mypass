package com.interview.backend.interview;

import com.interview.backend.ai.AiInterviewService;
import com.interview.backend.ai.AiService;
import com.interview.backend.interview.dto.QuestionResponse;
import com.interview.backend.project.ProjectFile;
import com.interview.backend.project.ProjectFileRepository;
import com.interview.backend.project.ProjectRepository;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceTest {

    @Mock
    private InterviewSessionRepository sessionRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectFileRepository projectFileRepository;

    @Mock
    private UserRepository userRepository;

    // AiService is an interface (mocks fine); AiInterviewService is a thin wrapper
    // around it with no other dependencies, so a real instance is used.
    @Mock
    private AiService aiService;

    private InterviewSessionService sessionService() {
        return new InterviewSessionService(
                sessionRepository, questionRepository, answerRepository,
                projectRepository, projectFileRepository, userRepository,
                new AiInterviewService(aiService));
    }

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    @Test
    void generatesQuestionFromProjectFilesExtractedText() {
        InterviewSession session = new InterviewSession(1L, 100L);
        session.setSessionId(5L);

        ProjectFile file = new ProjectFile(100L, "resume.pdf", "application/pdf", "key");
        file.setExtractedText("Spring Boot와 MariaDB로 만든 면접 서비스");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of(file));
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of());
        when(aiService.generateQuestion(org.mockito.ArgumentMatchers.contains("Spring Boot와 MariaDB로 만든 면접 서비스")))
                .thenReturn("Spring Boot를 선택한 이유는 무엇인가요?");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuestionResponse response = sessionService().generateQuestion("a@example.com", 5L);

        assertThat(response.questionText()).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
        assertThat(response.sequenceNo()).isEqualTo(1);
    }

    @Test
    void rejectsWhenProjectHasNoExtractedText() {
        InterviewSession session = new InterviewSession(1L, 100L);
        session.setSessionId(5L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of());

        assertThatThrownBy(() -> sessionService().generateQuestion("a@example.com", 5L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsGenerateQuestionForAnotherUsersSession() {
        InterviewSession othersSession = new InterviewSession(2L, 100L);
        othersSession.setSessionId(5L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(othersSession));

        assertThatThrownBy(() -> sessionService().generateQuestion("a@example.com", 5L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
