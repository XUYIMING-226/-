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
    for (const [index, question] of questions.entries()) {
      await connection.execute(
        'INSERT INTO questions (id, material_group_id, position, stem, options_json, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), materialGroupId, index + 1, question.stem, question.options ? JSON.stringify(question.options) : null, question.correctAnswer || null]
      );
    }
    await connection.commit();
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

const crypto = require('node:crypto');
module.exports = { configured, health, createMaterialGroup, listMaterialGroups, getMaterialGroup, createQuestions, listKnowledgeNodes, createKnowledgeNode, createAttempt };
