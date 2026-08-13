let pool;

function configured() {
  return Boolean(process.env.DATABASE_HOST && process.env.DATABASE_NAME && process.env.DATABASE_USER && process.env.DATABASE_PASSWORD);
}

function getPool() {
  if (!configured()) return null;
  if (!pool) {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 3306),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      waitForConnections: true,
      connectionLimit: 4,
      enableKeepAlive: true,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

async function health() {
  const connectionPool = getPool();
  if (!connectionPool) return { configured: false, connected: false };
  await connectionPool.query('SELECT 1');
  return { configured: true, connected: true };
}

async function createMaterialGroup({ id, subject, title, sourceName, ossObjectKey }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute(
    'INSERT INTO material_groups (id, subject, title, source_name, oss_object_key, status) VALUES (?, ?, ?, ?, ?, \'draft\')',
    [id, subject, title, sourceName || null, ossObjectKey]
  );
  return { id, subject, title, sourceName: sourceName || null, ossObjectKey, status: 'draft' };
}

async function listMaterialGroups() {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [rows] = await connectionPool.query(`
    SELECT g.id, g.subject, g.title, g.source_name AS sourceName, g.oss_object_key AS ossObjectKey, g.status, g.created_at AS createdAt,
           COUNT(q.id) AS questionCount
    FROM material_groups g LEFT JOIN questions q ON q.material_group_id = g.id
    GROUP BY g.id ORDER BY g.created_at DESC`);
  return rows;
}

async function getMaterialGroup(id) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [groups] = await connectionPool.execute(
    'SELECT id, subject, title, source_name AS sourceName, oss_object_key AS ossObjectKey, status, created_at AS createdAt FROM material_groups WHERE id = ?',
    [id]
  );
  if (!groups[0]) return null;
  const [questions] = await connectionPool.execute(
    'SELECT id, position, stem, options_json AS optionsJson, correct_answer AS correctAnswer FROM questions WHERE material_group_id = ? ORDER BY position ASC',
    [id]
  );
  return { ...groups[0], questions: questions.map(question => ({ ...question, options: question.optionsJson ? JSON.parse(question.optionsJson) : [] })) };
}

async function createQuestions(materialGroupId, questions) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const connection = await connectionPool.getConnection();
  try {
    await connection.beginTransaction();
    const created = [];
    for (const [index, question] of questions.entries()) {
      const id = crypto.randomUUID();
      await connection.execute(
        'INSERT INTO questions (id, material_group_id, position, stem, options_json, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
        [id, materialGroupId, index + 1, question.stem, question.options ? JSON.stringify(question.options) : null, question.correctAnswer || null]
      );
      created.push({ id, position: index + 1, stem: question.stem, options: question.options || [], correctAnswer: question.correctAnswer || null });
    }
    await connection.commit();
    return created;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function listKnowledgeNodes(subject) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [rows] = await connectionPool.execute('SELECT id, subject, parent_id AS parentId, title, note, created_at AS createdAt FROM knowledge_nodes WHERE subject = ? ORDER BY created_at ASC', [subject]);
  return rows;
}

async function createKnowledgeNode({ id, subject, parentId, title, note }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute('INSERT INTO knowledge_nodes (id, subject, parent_id, title, note) VALUES (?, ?, ?, ?, ?)', [id, subject, parentId || null, title, note || null]);
  return { id, subject, parentId: parentId || null, title, note: note || null };
}

async function createAttempt({ id, questionId, selectedAnswer, isCorrect, durationSeconds }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute('INSERT INTO attempts (id, question_id, selected_answer, is_correct, duration_seconds) VALUES (?, ?, ?, ?, ?)', [id, questionId, selectedAnswer || null, isCorrect ?? null, durationSeconds]);
  return { id, questionId, selectedAnswer: selectedAnswer || null, isCorrect: isCorrect ?? null, durationSeconds };
}

async function createAsset({ id, subject, title, sourceName, contentType, ossObjectKey, userNote }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute(
    'INSERT INTO learning_assets (id, subject, title, source_name, content_type, oss_object_key, user_note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, subject || null, title, sourceName || null, contentType || null, ossObjectKey, userNote || null]
  );
  return { id, subject: subject || null, title, sourceName: sourceName || null, contentType: contentType || null, ossObjectKey, status: 'inbox', userNote: userNote || null };
}

async function listAssets(status = 'inbox') {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [rows] = await connectionPool.execute(
    'SELECT id, subject, title, source_name AS sourceName, content_type AS contentType, oss_object_key AS ossObjectKey, status, user_note AS userNote, created_at AS createdAt FROM learning_assets WHERE status = ? ORDER BY created_at DESC',
    [status]
  );
  return rows;
}

async function createEntityNote({ id, entityType, entityId, noteType, content }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute(
    'INSERT INTO entity_notes (id, entity_type, entity_id, note_type, content) VALUES (?, ?, ?, ?, ?)',
    [id, entityType, entityId, noteType, content]
  );
  return { id, entityType, entityId, noteType, content };
}

async function listEntityNotes(entityType, entityId) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [rows] = await connectionPool.execute(
    'SELECT id, entity_type AS entityType, entity_id AS entityId, note_type AS noteType, content, created_at AS createdAt, updated_at AS updatedAt FROM entity_notes WHERE entity_type = ? AND entity_id = ? ORDER BY updated_at DESC',
    [entityType, entityId]
  );
  return rows;
}

async function assignQuestionKnowledgeNode(questionId, knowledgeNodeId, source = 'manual', userConfirmed = true) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute(
    'INSERT INTO question_knowledge_nodes (question_id, knowledge_node_id, source, user_confirmed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE source = VALUES(source), user_confirmed = VALUES(user_confirmed)',
    [questionId, knowledgeNodeId, source, userConfirmed]
  );
}

async function createReviewItem({ id, questionId, dueAt, intervalDays = 1 }) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  await connectionPool.execute(
    'INSERT INTO review_items (id, question_id, due_at, interval_days) VALUES (?, ?, ?, ?)',
    [id, questionId, dueAt, intervalDays]
  );
  return { id, questionId, dueAt, intervalDays, state: 'due' };
}

async function getPracticePlan(subject) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [rows] = await connectionPool.execute(`
    SELECT q.id, q.material_group_id AS materialGroupId, q.position, q.stem, q.options_json AS optionsJson, q.correct_answer AS correctAnswer,
           r.due_at AS dueAt, r.interval_days AS intervalDays,
           COUNT(a.id) AS attemptCount,
           SUM(a.is_correct = 0) AS wrongCount,
           ROUND(AVG(a.duration_seconds)) AS averageSeconds
    FROM questions q
    JOIN material_groups g ON g.id = q.material_group_id
    LEFT JOIN review_items r ON r.question_id = q.id AND r.state = 'due'
    LEFT JOIN attempts a ON a.question_id = q.id
    WHERE g.subject = ?
    GROUP BY q.id, r.due_at, r.interval_days
    ORDER BY (r.due_at IS NULL), r.due_at ASC, wrongCount DESC, averageSeconds DESC
    LIMIT 30`, [subject]);
  return rows.map(row => ({ ...row, options: row.optionsJson ? JSON.parse(row.optionsJson) : [] }));
}

async function getDashboard(subject) {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('Database is not configured.');
  const [[summary]] = await connectionPool.execute(`
    SELECT COUNT(DISTINCT q.id) AS questionCount, COUNT(a.id) AS attemptCount,
           COALESCE(ROUND(100 * AVG(a.is_correct = 1), 1), 0) AS accuracy,
           COALESCE(ROUND(AVG(a.duration_seconds)), 0) AS averageSeconds
    FROM material_groups g
    LEFT JOIN questions q ON q.material_group_id = g.id
    LEFT JOIN attempts a ON a.question_id = q.id
    WHERE g.subject = ?`, [subject]);
  const [causes] = await connectionPool.execute(`
    SELECT n.content AS label, COUNT(*) AS count
    FROM entity_notes n
    JOIN questions q ON n.entity_type = 'question' AND n.entity_id = q.id
    JOIN material_groups g ON g.id = q.material_group_id
    WHERE g.subject = ? AND n.note_type = 'error_cause'
    GROUP BY n.content ORDER BY count DESC LIMIT 5`, [subject]);
  const [[reviews]] = await connectionPool.execute(`
    SELECT COUNT(*) AS dueCount FROM review_items r
    JOIN questions q ON q.id = r.question_id JOIN material_groups g ON g.id = q.material_group_id
    WHERE g.subject = ? AND r.state = 'due' AND r.due_at <= NOW()`, [subject]);
  return { summary, causes, dueCount: reviews.dueCount };
}

const crypto = require('node:crypto');
module.exports = { configured, health, createMaterialGroup, listMaterialGroups, getMaterialGroup, createQuestions, listKnowledgeNodes, createKnowledgeNode, createAttempt, createAsset, listAssets, createEntityNote, listEntityNotes, assignQuestionKnowledgeNode, createReviewItem, getPracticePlan, getDashboard };
