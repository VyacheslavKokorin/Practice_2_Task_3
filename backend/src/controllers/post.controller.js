import pool from '../config/db.js';

// Создать пост
export async function createPost(req, res, next) {
  try {
    const { title, content, visibility = 'public' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Заголовок и содержимое обязательны' });
    }

    if (!['public', 'private', 'on_request'].includes(visibility)) {
      return res.status(400).json({ error: 'Недопустимое значение visibility' });
    }

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, visibility) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, visibility]
    );

    res.status(201).json({ id: result.insertId, title, content, visibility });
  } catch (err) {
    next(err);
  }
}

// Список публичных постов
export async function getPosts(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.visibility, p.created_at,
              u.id AS user_id, u.username
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.visibility = 'public'
       ORDER BY p.created_at DESC`
    );

    res.json({ posts: rows });
  } catch (err) {
    next(err);
  }
}

// Один пост по id
export async function getPost(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.visibility, p.created_at,
              u.id AS user_id, u.username
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [req.params.id]
    );

    const post = rows[0];
    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    // private видит только автор
    if (post.visibility === 'private' && post.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    // on_request — автор или одобренный запрос
    if (post.visibility === 'on_request' && post.user_id !== req.user?.id) {
      const [access] = await pool.query(
        `SELECT id FROM post_access_requests
         WHERE post_id = ? AND requester_id = ? AND status = 'approved'`,
        [post.id, req.user?.id]
      );
      if (!access.length) {
        return res.status(403).json({ error: 'Требуется запрос доступа' });
      }
    }

    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// Редактировать пост
export async function updatePost(req, res, next) {
  try {
    const { title, content, visibility } = req.body;

    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    const post = rows[0];

    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    // только автор может редактировать
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const newTitle      = title      ?? post.title;
    const newContent    = content    ?? post.content;
    const newVisibility = visibility ?? post.visibility;

    if (!['public', 'private', 'on_request'].includes(newVisibility)) {
      return res.status(400).json({ error: 'Недопустимое значение visibility' });
    }

    await pool.query(
      'UPDATE posts SET title = ?, content = ?, visibility = ? WHERE id = ?',
      [newTitle, newContent, newVisibility, post.id]
    );

    res.json({ id: post.id, title: newTitle, content: newContent, visibility: newVisibility });
  } catch (err) {
    next(err);
  }
}

// Удалить пост
export async function deletePost(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    const post = rows[0];

    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [post.id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}