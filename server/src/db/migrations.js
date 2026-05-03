import db from './connection.js'

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      total_aulas INTEGER,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weeks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      context     TEXT,
      date_start  TEXT NOT NULL,
      date_end    TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS week_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      total_aulas INTEGER,
      UNIQUE(week_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id             INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      subject_id          INTEGER NOT NULL REFERENCES subjects(id),
      dia                 TEXT NOT NULL CHECK(dia IN ('Seg','Ter','Qua','Qui','Sex','Sáb','Dom')),
      estudado            INTEGER NOT NULL DEFAULT 0,
      aula_estudada       TEXT,
      num_pags_inicio     INTEGER,
      num_pags_fim        INTEGER,
      qtd_pags_estudadas  INTEGER,
      num_exercicios      INTEGER DEFAULT 0,
      num_acertos         INTEGER DEFAULT 0,
      percentual_acerto   REAL,
      dificuldade         TEXT,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_week_id ON entries(week_id);
    CREATE INDEX IF NOT EXISTS idx_entries_subject_id ON entries(subject_id);
    CREATE INDEX IF NOT EXISTS idx_entries_week_dia ON entries(week_id, dia);

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL DEFAULT 'Sem título',
      content    TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS concursos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      banca      TEXT,
      data_prova TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materias (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      concurso_id INTEGER NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conteudos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
      nome       TEXT NOT NULL,
      url        TEXT,
      concluido  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Adiciona total_aulas em entries caso não exista (migração incremental)
  try {
    db.exec('ALTER TABLE entries ADD COLUMN total_aulas INTEGER')
  } catch {}

  // Adiciona color em subjects caso não exista (migração incremental)
  try {
    db.exec('ALTER TABLE subjects ADD COLUMN color TEXT')
  } catch {}

  // Adiciona cargo em concursos caso não exista (migração incremental)
  try {
    db.exec('ALTER TABLE concursos ADD COLUMN cargo TEXT')
  } catch {}

  // Adiciona link em concursos caso não exista (migração incremental)
  try {
    db.exec('ALTER TABLE concursos ADD COLUMN link TEXT')
  } catch {}

  // Adiciona observacoes em questoes caso não exista (migração incremental)
  try {
    db.exec("ALTER TABLE questoes ADD COLUMN observacoes TEXT NOT NULL DEFAULT ''")
  } catch {}

  // Adiciona colunas de resultado em provas caso não existam (migração incremental)
  try { db.exec('ALTER TABLE provas ADD COLUMN inscritos INTEGER') } catch {}
  try { db.exec('ALTER TABLE provas ADD COLUMN colocacao INTEGER') } catch {}
  try { db.exec('ALTER TABLE provas ADD COLUMN vagas_ac INTEGER') } catch {}
  try { db.exec('ALTER TABLE provas ADD COLUMN vagas_cr INTEGER') } catch {}

  // Tabelas de Provas / Questões
  db.exec(`
    CREATE TABLE IF NOT EXISTS provas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      tipo       TEXT NOT NULL DEFAULT 'prova',
      anula      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prova_concursos (
      prova_id    INTEGER NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
      concurso_id INTEGER NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
      PRIMARY KEY (prova_id, concurso_id)
    );

    CREATE TABLE IF NOT EXISTS questoes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      prova_id   INTEGER NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      nome       TEXT NOT NULL DEFAULT '',
      marcada    TEXT NOT NULL DEFAULT '',
      gabarito   TEXT NOT NULL DEFAULT '',
      acertou    INTEGER NOT NULL DEFAULT 0,
      branco     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Persiste ordem drag-and-drop das disciplinas por semana/dia
  db.exec(`
    CREATE TABLE IF NOT EXISTS week_day_orders (
      week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      dia         TEXT    NOT NULL,
      subject_ids TEXT    NOT NULL,
      PRIMARY KEY (week_id, dia)
    );
  `)

  // Substitui materias por vínculo direto com disciplinas (subjects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS concurso_subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      concurso_id INTEGER NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(concurso_id, subject_id)
    );
  `)

  // Recria conteudos removendo NOT NULL de materia_id e garantindo concurso_subject_id
  // (SQLite não suporta DROP/ALTER COLUMN — única forma é recriar a tabela)
  const conteudosCols = db.prepare('PRAGMA table_info(conteudos)').all()
  const materiaIdCol = conteudosCols.find(c => c.name === 'materia_id')
  if (materiaIdCol && materiaIdCol.notnull === 1) {
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec(`
      CREATE TABLE conteudos_v2 (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        concurso_subject_id INTEGER REFERENCES concurso_subjects(id) ON DELETE CASCADE,
        materia_id          INTEGER REFERENCES materias(id) ON DELETE CASCADE,
        nome                TEXT NOT NULL,
        url                 TEXT,
        concluido           INTEGER NOT NULL DEFAULT 0,
        created_at          TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO conteudos_v2 (id, materia_id, nome, url, concluido, created_at)
        SELECT id, materia_id, nome, url, concluido, created_at FROM conteudos;
      DROP TABLE conteudos;
      ALTER TABLE conteudos_v2 RENAME TO conteudos;
    `)
    db.exec('PRAGMA foreign_keys = ON')
  }

  console.log('Migrations executadas com sucesso.')
}
