-- 면접프젝 DB 스키마 (MySQL 8.0 기준)
-- 실행: mysql -u interview_app -p interview_db < schema.sql

CREATE TABLE users (
  user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(100),
  provider VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  project_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  structured_info JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE project_files (
  file_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  s3_key VARCHAR(500),
  extracted_text LONGTEXT,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_files_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE interview_sessions (
  session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'READY',
  started_at DATETIME,
  ended_at DATETIME,
  overall_content_score FLOAT,
  overall_delivery_score FLOAT,
  strengths TEXT,
  weaknesses TEXT,
  summary_text TEXT,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_project FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE questions (
  question_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  parent_question_id BIGINT NULL,
  sequence_no INT,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20),
  tts_audio_url VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_questions_session FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_questions_parent FOREIGN KEY (parent_question_id) REFERENCES questions(question_id) ON DELETE SET NULL
);

CREATE TABLE answers (
  answer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT NOT NULL,
  attempt_no INT NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT TRUE,
  answer_text TEXT,
  audio_url VARCHAR(500),
  video_url VARCHAR(500),
  duration_sec INT,
  gaze_stability_score FLOAT,
  voice_tremor_score FLOAT,
  speaking_rate_wpm FLOAT,
  filler_word_count INT,
  relevance_score FLOAT,
  clarity_score FLOAT,
  feedback_text TEXT,
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);
