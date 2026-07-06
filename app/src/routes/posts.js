const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

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

module.exports = router;