import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const SALT_ROUNDS = 10;

function createToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function validateRegisterInput({ username, email, password }) {
  const errors = [];
  if (!username || username.trim().length < 3) {
    errors.push('Имя пользователя должно содержать минимум 3 символа');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Некорректный email');
  }
  if (!password || password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }
  return errors;
}

export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    const errors = validateRegisterInput({ username, email, password });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const token = createToken(result.insertId);

    res.status(201).json({
      user: { id: result.insertId, username, email },
      token,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.sqlMessage.includes('email') ? 'email' : 'имя пользователя';
      return res.status(409).json({ error: `Такой ${field} уже зарегистрирован` });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    const user = rows[0];

    // одинаковая ошибка и для несуществующего пользователя, и для неверного пароля
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = createToken(user.id);

    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}