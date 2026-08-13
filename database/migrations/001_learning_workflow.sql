-- Run once on the existing xingce_study database after schema.sql.
-- These tables keep uploaded materials, user notes, knowledge assignments and review state separate.

CREATE TABLE IF NOT EXISTS learning_assets (
  id CHAR(36) PRIMARY KEY,
  subject VARCHAR(40) NULL,
  title VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NULL,
  content_type VARCHAR(120) NULL,
  oss_object_key VARCHAR(512) NOT NULL,
  status ENUM('inbox','organized','archived') NOT NULL DEFAULT 'inbox',
  user_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_status (status),
  INDEX idx_asset_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entity_notes (
  id CHAR(36) PRIMARY KEY,
  entity_type ENUM('knowledge_node','material_group','question','asset') NOT NULL,
  entity_id CHAR(36) NOT NULL,
  note_type ENUM('error_cause','fast_method','pitfall','reflection','free') NOT NULL DEFAULT 'free',
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_note_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS question_knowledge_nodes (
  question_id CHAR(36) NOT NULL,
  knowledge_node_id CHAR(36) NOT NULL,
  source ENUM('manual','ai_suggestion') NOT NULL DEFAULT 'manual',
  user_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id, knowledge_node_id),
  CONSTRAINT fk_qkn_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_qkn_node FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS review_items (
  id CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  due_at DATETIME NOT NULL,
  interval_days SMALLINT NOT NULL DEFAULT 1,
  state ENUM('due','completed','suspended') NOT NULL DEFAULT 'due',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_review_due (state, due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
