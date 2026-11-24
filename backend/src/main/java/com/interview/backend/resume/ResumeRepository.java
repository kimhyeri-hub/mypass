package com.interview.backend.resume;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserIdOrderByUploadedAtAscResumeIdAsc(Long userId);
}
