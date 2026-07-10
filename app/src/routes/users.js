const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/authMiddleware");

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

    let isSubscribed = false;

    if (req.session.userId && req.session.userId !== user.id) {
    const [subscriptions] = await db.query(
        `SELECT id
        FROM subscriptions
        WHERE follower_id = ? AND following_id = ?`,
        [req.session.userId, user.id]
    );

    isSubscribed = subscriptions.length > 0;
    }

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

    if (req.session.userId && req.session.userId !== user.id) {
        if (isSubscribed) {
            html += `
            <form method="POST" action="/users/${user.id}/unfollow">
                <button type="submit">Отписаться</button>
            </form>
            `;
        } else {
            html += `
            <form method="POST" action="/users/${user.id}/follow">
                <button type="submit">Подписаться</button>
            </form>
            `;
        }
    }

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

router.post("/users/:id/follow", requireAuth, async (req, res) => {
  const followingId = Number(req.params.id);
  const followerId = req.session.userId;

  if (!Number.isInteger(followingId) || followingId <= 0) {
    return res.status(404).send("Пользователь не найден");
  }

  if (followerId === followingId) {
    return res.status(400).send("Нельзя подписаться на самого себя");
  }

  try {
    await db.query(
      `INSERT IGNORE INTO subscriptions (follower_id, following_id)
       VALUES (?, ?)`,
      [followerId, followingId]
    );

    res.redirect(`/users/${followingId}`);
  } catch (error) {
    console.error("Ошибка подписки:", error.message);
    res.status(500).send("Не удалось подписаться");
  }
});

router.post("/users/:id/unfollow", requireAuth, async (req, res) => {
  const followingId = Number(req.params.id);
  const followerId = req.session.userId;

  if (!Number.isInteger(followingId) || followingId <= 0) {
    return res.status(404).send("Пользователь не найден");
  }

  try {
    await db.query(
      `DELETE FROM subscriptions
       WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );

    res.redirect(`/users/${followingId}`);
  } catch (error) {
    console.error("Ошибка отписки:", error.message);
    res.status(500).send("Не удалось отписаться");
  }
});

module.exports = router;