package com.interview.backend.interview;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findBySessionIdOrderBySequenceNoAsc(Long sessionId);
}
