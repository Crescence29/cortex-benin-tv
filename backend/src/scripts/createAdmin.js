// Usage: node src/scripts/createAdmin.js "Nom" email@example.com motdepasse
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: node src/scripts/createAdmin.js "Nom" email@example.com motdepasse');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await pool.query(
  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin")',
  [name, email, hash]
);

console.log(`Administrateur créé : ${email}`);
process.exit(0);
