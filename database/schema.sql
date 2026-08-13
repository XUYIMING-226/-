-- MySQL 8.0 schema for the personal study workspace.
-- A material group and its related subquestions are deliberately kept linked.
CREATE TABLE knowledge_nodes (
  id CHAR(36) PRIMARY KEY,
  subject VARCHAR(40) NOT NULL,
  parent_id CHAR(36) NULL,
  title VARCHAR(120) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_knowledge_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE material_groups (
  id CHAR(36) PRIMARY KEY,
  subject VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NULL,
  oss_object_key VARCHAR(512) NOT NULL,
  status ENUM('draft','classified','active','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE questions (
  id CHAR(36) PRIMARY KEY,
  material_group_id CHAR(36) NOT NULL,
  position SMALLINT NOT NULL,
  stem TEXT NOT NULL,
  options_json JSON NULL,
  correct_answer VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_question_group FOREIGN KEY (material_group_id) REFERENCES material_groups(id) ON DELETE CASCADE,
  UNIQUE KEY uq_question_position (material_group_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE error_records (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  knowledge_node_id CHAR(36) NULL,
  error_cause VARCHAR(255) NULL,
  fast_method_note TEXT NULL,
  user_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_error_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_error_knowledge FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attempts (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  selected_answer VARCHAR(32) NULL,
  is_correct BOOLEAN NULL,
  duration_seconds INT NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attempt_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
