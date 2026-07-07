const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

// Создание поста
router.get("/posts/create", requireAuth, (req, res) => {
  res.send(`
    <h1>Создание поста</h1>

    <form method="POST" action="/posts/create">
      <div>
        <label for="title">Заголовок:</label>
        <input id="title" name="title" type="text">
      </div>

      <div>
        <label for="content">Текст поста:</label>
        <textarea id="content" name="content"></textarea>
      </div>

      <button type="submit">Создать пост</button>
    </form>
  `);
});

router.post("/posts/create", requireAuth, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).send("Заголовок и текст поста должны быть заполнены");
  }

  try {
    await db.query(
      `INSERT INTO posts (user_id, title, content)
       VALUES (?, ?, ?)`,
      [req.session.userId, title, content]
    );

    res.send("Пост успешно создан");
  } catch (error) {
    console.error("Ошибка создания поста:", error.message);
    res.status(500).send("Не удалось создать пост");
  }
});

// Просмотр поста
router.get("/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  try {
    const [posts] = await db.query(
      `SELECT posts.id, posts.title, posts.content, posts.created_at, users.username
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.id = ?
         AND posts.visibility = 'public'`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).send("Пост не найден");
    }

    const post = posts[0];

    res.send(`
      <h1>${post.title}</h1>
      <p>${post.content}</p>
      <p>Автор: ${post.username}</p>
      <p>Дата: ${post.created_at}</p>

      <p><a href="/">Вернуться к списку постов</a></p>
    `);
  } catch (error) {
    console.error("Ошибка получения поста:", error.message);
    res.status(500).send("Не удалось получить пост");
  }
});

// Страница редактирования поста
router.get("/posts/:id/edit", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  try {
    const [posts] = await db.query(
      `SELECT id, title, content
       FROM posts
       WHERE id = ? AND user_id = ?`,
      [postId, req.session.userId]
    );

    if (posts.length === 0) {
      return res.status(403).send("Вы не можете редактировать этот пост");
    }

    const post = posts[0];

    res.send(`
      <h1>Редактирование поста</h1>

      <form method="POST" action="/posts/${post.id}/edit">
        <div>
          <label for="title">Заголовок:</label>
          <input id="title" name="title" type="text" value="${post.title}">
        </div>

        <div>
          <label for="content">Текст поста:</label>
          <textarea id="content" name="content">${post.content}</textarea>
        </div>

        <button type="submit">Сохранить изменения</button>
      </form>
    `);
  } catch (error) {
    console.error("Ошибка получения поста для редактирования:", error.message);
    res.status(500).send("Не удалось открыть страницу редактирования");
  }
});

// Сохранение поста после редактирования
router.post("/posts/:id/edit", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { title, content } = req.body;

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  if (!title || !content) {
    return res.status(400).send("Заголовок и текст поста должны быть заполнены");
  }

  try {
    const [result] = await db.query(
      `UPDATE posts
       SET title = ?, content = ?
       WHERE id = ? AND user_id = ?`,
      [title, content, postId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).send("Вы не можете редактировать этот пост");
    }

    res.send("Пост успешно обновлён");
  } catch (error) {
    console.error("Ошибка редактирования поста:", error.message);
    res.status(500).send("Не удалось обновить пост");
  }
});

module.exports = router;