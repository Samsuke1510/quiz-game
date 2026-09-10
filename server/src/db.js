// db.js
// ==========================================================================
// WHERE RANDOM-GAME SCORES ARE STORED
// ==========================================================================
//
// Two storage backends, chosen automatically:
//   1. PostgreSQL (via the "pg" package) when we have a DATABASE_URL.
//      This is what Railway uses — the scores persist forever.
//   2. An in-memory list when there's NO DATABASE_URL. That keeps local
//      development working with zero setup (you don't need to install
//      PostgreSQL). The list disappears when the server restarts, which is
//      fine for testing.
//
// Either way, the app talks to the SAME two functions below — it can't tell
// (and doesn't care) which storage is underneath.
//
// ONLY Random Game scores are saved here (per the user's decision) — solo
// and coded-room games are not.
// ==========================================================================

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

// --------------------------------------------------------------------------
// In-memory backend (no DATABASE_URL — local development)
// --------------------------------------------------------------------------
const memoryRows = []; // shape: { playerName, score, total, percent, createdAt }
let nextId = 1;

// --------------------------------------------------------------------------
// PostgreSQL backend (DATABASE_URL is set — on Railway)
// --------------------------------------------------------------------------
let pool = null;

if (DATABASE_URL) {
  pool = new pg.Pool({ connectionString: DATABASE_URL });
  // Make sure the table exists. Runs as soon as the app boots, before any
  // scores are saved. "IF NOT EXISTS" makes this safe to run every time.
  pool
    .query(
      `CREATE TABLE IF NOT EXISTS random_scores (
        id          SERIAL PRIMARY KEY,
        player_name TEXT NOT NULL,
        score       INTEGER NOT NULL,
        total       INTEGER NOT NULL,
        percent     INTEGER NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    )
    .catch((err) => {
      console.error("Could not create random_scores table:", err.message);
    });
}

// --------------------------------------------------------------------------
// Helpers shared by both backends
// --------------------------------------------------------------------------

/** Round points into a percentage (0-100) so different round lengths compare fairly. */
function percentOf(score, total) {
  if (!total) return 0;
  return Math.round((score / total) * 100);
}

/** Tidy a raw DB/in-memory row into the shape the app displays. */
function tidyRow(row, id) {
  return {
    id,
    playerName: row.player_name ?? row.playerName,
    score: row.score,
    total: row.total,
    percent: row.percent,
    createdAt: row.created_at ?? row.createdAt,
  };
}

// --------------------------------------------------------------------------
// The two functions the rest of the app uses
// --------------------------------------------------------------------------

/**
 * Save the finished standings of a Random Game.
 * @param {Array<{playerName: string, score: number, total: number}>} rows
 *        one entry per player in the match
 */
export async function saveRandomScores(rows = []) {
  if (rows.length === 0) return;

  if (pool) {
    // One batched INSERT, then send the whole match as a single transaction
    // so a partial write can't happen (all or nothing).
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const r of rows) {
        await client.query(
          `INSERT INTO random_scores (player_name, score, total, percent)
           VALUES ($1, $2, $3, $4)`,
          [String(r.playerName || "Anonymous").slice(0, 20), r.score, r.total, percentOf(r.score, r.total)]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  // In-memory fallback.
  for (const r of rows) {
    memoryRows.push({
      id: nextId++,
      playerName: String(r.playerName || "Anonymous").slice(0, 20),
      score: r.score,
      total: r.total,
      percent: percentOf(r.score, r.total),
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Get the best Random-Game scores, best percentage first.
 * @param {number} limit how many rows to return (default 20)
 */
export async function getTopRandomScores(limit = 20) {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT id, player_name, score, total, percent, created_at
       FROM random_scores
       ORDER BY percent DESC, score DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r) => tidyRow(r, r.id));
  }

  // In-memory fallback — same ordering.
  return memoryRows
    .slice()
    .sort((a, b) => b.percent - a.percent || b.score - a.score || (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}