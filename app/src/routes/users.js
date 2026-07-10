const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(404).send("Пользователь не найден");
  }

  try {
    const [users] = await db.query(
      `SELECT id, username, created_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).send("Пользователь не найден");
    }

    const user = users[0];

    const [posts] = await db.query(
      `SELECT id, title, content, created_at
       FROM posts
       WHERE user_id = ? AND visibility = 'public'
       ORDER BY created_at DESC`,
      [userId]
    );

    let html = `
      <h1>Профиль пользователя ${user.username}</h1>
      <p>Дата регистрации: ${user.created_at}</p>
      <h2>Публичные посты пользователя</h2>
    `;

    if (posts.length === 0) {
      html += "<p>У пользователя пока нет публичных постов.</p>";
    } else {
      for (const post of posts) {
        html += `
          <article>
            <h3><a href="/posts/${post.id}">${post.title}</a></h3>
            <p>${post.content}</p>
            <p>Дата: ${post.created_at}</p>
            <hr>
          </article>
        `;
      }
    }

    html += `<p><a href="/">На главную</a></p>`;

    res.send(html);
  } catch (error) {
    console.error("Ошибка получения профиля:", error.message);
    res.status(500).send("Не удалось открыть профиль");
  }
});

module.exports = router;