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
  `)

  // Adiciona total_aulas em entries caso não exista (migração incremental)
  try {
    db.exec('ALTER TABLE entries ADD COLUMN total_aulas INTEGER')
  } catch {}

  console.log('Migrations executadas com sucesso.')
}
