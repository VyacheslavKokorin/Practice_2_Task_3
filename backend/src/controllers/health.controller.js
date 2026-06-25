import pool from '../config/db.js';

export async function checkHealth(req, res, next) {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    next(err);
  }
}