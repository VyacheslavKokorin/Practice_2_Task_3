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

    const [comments] = await db.query(
      `SELECT comments.content, comments.created_at, users.username
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.post_id = ?
      ORDER BY comments.created_at ASC`,
      [postId]
    );

    const post = posts[0];

    let commentsHtml = "<h2>Комментарии</h2>";

    if (comments.length === 0) {
      commentsHtml += "<p>Комментариев пока нет.</p>";
    } else {
      for (const comment of comments) {
        commentsHtml += `
          <div>
            <p>${comment.content}</p>
            <p>Автор: ${comment.username}</p>
            <p>Дата: ${comment.created_at}</p>
          </div>
          <hr>
        `;
      }
    }

    let commentForm = "";

    if (req.session.userId) {
      commentForm = `
        <h2>Добавить комментарий</h2>

        <form method="POST" action="/posts/${post.id}/comments">
          <div>
            <textarea name="content"></textarea>
          </div>

          <button type="submit">Отправить</button>
        </form>
      `;
    }

    res.send(`
      <h1>${post.title}</h1>
      <p>${post.content}</p>
      <p>Автор: ${post.username}</p>
      <p>Дата: ${post.created_at}</p>

      ${commentsHtml}
      ${commentForm}

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
      <form method="POST" action="/posts/${post.id}/delete">
        <button type="submit">Удалить пост</button>
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

// Удаление поста
router.post("/posts/:id/delete", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  try {
    const [result] = await db.query(
      `DELETE FROM posts
       WHERE id = ? AND user_id = ?`,
      [postId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).send("Вы не можете удалить этот пост");
    }

    res.redirect("/");
  } catch (error) {
    console.error("Ошибка удаления поста:", error.message);
    res.status(500).send("Не удалось удалить пост");
  }
});

// Добавление комментария
router.post("/posts/:id/comments", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { content } = req.body;

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  if (!content || content.trim() === "") {
    return res.status(400).send("Комментарий не может быть пустым");
  }

  try {
    const [posts] = await db.query(
      `SELECT id
       FROM posts
       WHERE id = ? AND visibility = 'public'`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).send("Пост не найден");
    }

    await db.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES (?, ?, ?)`,
      [postId, req.session.userId, content]
    );

    res.redirect(`/posts/${postId}`);
  } catch (error) {
    console.error("Ошибка добавления комментария:", error.message);
    res.status(500).send("Не удалось добавить комментарий");
  }
});


module.exports = router;