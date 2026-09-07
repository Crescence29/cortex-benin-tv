import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT code, name, native_name FROM languages ORDER BY sort_order');
  res.json(rows);
});

export default router;
