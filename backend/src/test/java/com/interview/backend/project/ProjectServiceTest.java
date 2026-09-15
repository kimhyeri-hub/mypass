package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectCreateRequest;
import com.interview.backend.project.dto.ProjectResponse;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    private ProjectService projectService;

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    @Test
    void createsProjectForCurrentUser() {
        projectService = new ProjectService(projectRepository, userRepository);
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
        projectService = new ProjectService(projectRepository, userRepository);
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.createProject(
                "missing@example.com", new ProjectCreateRequest("Mypass", "Backend")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void listsOnlyCurrentUsersProjects() {
        projectService = new ProjectService(projectRepository, userRepository);
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(new Project(1L, "Mypass", "Backend")));

        List<ProjectResponse> projects = projectService.getMyProjects("a@example.com");

        assertThat(projects).hasSize(1);
        assertThat(projects.get(0).title()).isEqualTo("Mypass");
    }
}
