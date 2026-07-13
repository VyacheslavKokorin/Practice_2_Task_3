const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const db = require("../db");
const crypto = require("crypto");
const layout = require("../views/layout");
const formatDate = require("../utils/formatDate");

const router = express.Router();

// Создание поста
router.get("/posts/create", requireAuth, (req, res) => {
  const html = `
    <h1>Создание поста</h1>

    <form method="POST" action="/posts/create">
      <div>
        <label for="title">Заголовок:</label>
        <input id="title" type="text" name="title">
      </div>

      <div>
        <label for="content">Текст поста:</label>
        <textarea id="content" name="content"></textarea>
      </div>

      <div>
        <label for="tags">Теги через запятую:</label>
        <input id="tags" type="text" name="tags">
      </div>

      <div>
        <label for="visibility">Видимость:</label>
        <select id="visibility" name="visibility">
          <option value="public">Публичный пост</option>
          <option value="hidden">Скрытый пост по ссылке</option>
        </select>
      </div>

      <button type="submit">Опубликовать</button>
    </form>

    <p><a href="/">На главную</a></p>
  `;

  res.send(layout("Создание поста", html, req));
});

router.post("/posts/create", requireAuth, async (req, res) => {
  const { title, content, tags, visibility } = req.body;

  if (!title || !content) {
    return res.status(400).send("Заголовок и текст поста должны быть заполнены");
  }

  const postVisibility = visibility === "hidden" ? "hidden" : "public";
  const hiddenToken = postVisibility === "hidden" ? crypto.randomBytes(32).toString("hex") : null;

  try {
    const [result] = await db.query(
      `INSERT INTO posts (user_id, title, content, visibility, hidden_token)
      VALUES (?, ?, ?, ?, ?)`,
      [req.session.userId, title, content, postVisibility, hiddenToken]
    );

    const postId = result.insertId;

    if (tags && tags.trim() !== "") {
      const tagNames = tags
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== "");

      for (const tagName of tagNames) {
        await db.query(
          `INSERT IGNORE INTO tags (name)
          VALUES (?)`,
          [tagName]
        );

        const [tagRows] = await db.query(
          `SELECT id FROM tags WHERE name = ?`,
          [tagName]
        );

        const tagId = tagRows[0].id;

        await db.query(
          `INSERT IGNORE INTO post_tags (post_id, tag_id)
          VALUES (?, ?)`,
          [postId, tagId]
        );
      }
    }

    if (postVisibility === "hidden") {
      return res.send(`
        <p>Скрытый пост успешно создан.</p>
        <p>Ссылка для доступа:</p>
        <p><a href="/posts/${postId}?token=${hiddenToken}">/posts/${postId}?token=${hiddenToken}</a></p>
        <p><a href="/posts/${postId}">Открыть пост как автор</a></p>
        <p><a href="/">На главную</a></p>
  `);
    }

    res.redirect(`/posts/${postId}`);
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
      `SELECT posts.id, posts.user_id, posts.title, posts.content,
          posts.visibility, posts.hidden_token, posts.created_at, users.username
          FROM posts JOIN users ON posts.user_id = users.id
          WHERE posts.id = ?`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).send(layout("Пост не найден", `
      <h1>Пост не найден</h1>
      <p>Такого поста не существует или у вас нет доступа к нему.</p>
      <p><a href="/">Вернуться на главную</a></p>
    `, req));
    }

    const [comments] = await db.query(
      `SELECT comments.content, comments.created_at, users.username
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE comments.post_id = ?
      ORDER BY comments.created_at ASC`,
      [postId]
    );

    const [tags] = await db.query(
      `SELECT tags.name
      FROM tags
      JOIN post_tags ON tags.id = post_tags.tag_id
      WHERE post_tags.post_id = ?
      ORDER BY tags.name`,
      [postId]
    );

    const post = posts[0];

    if (post.visibility === "hidden") {
      const token = req.query.token;
      const isAuthor = req.session.userId === post.user_id;

      if (!isAuthor && token !== post.hidden_token) {
        return res.status(403).send("Нет доступа к скрытому посту");
      }
    }

    let commentsHtml = "<h2>Комментарии</h2>";

    if (comments.length === 0) {
      commentsHtml += "<p>Комментариев пока нет.</p>";
    } else {
      for (const comment of comments) {
        commentsHtml += `
          <div>
            <p>${comment.content}</p>
            <p>Автор: ${comment.username}</p>
            <p>Дата: ${formatDate(comment.created_at)}</p>
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

    let tagsHtml = "<h2>Теги</h2>";

    if (tags.length === 0) {
      tagsHtml += "<p>У поста нет тегов.</p>";
    } else {
      for (const tag of tags) {
        tagsHtml += `<a href="/?tag=${tag.name}">#${tag.name}</a> `;
      }
    }

    let authorActions = "";

    if (req.session.userId === post.user_id) {
      authorActions = `
        <p>
          <a href="/posts/${post.id}/edit">Редактировать пост</a>
        </p>
  `;
    }

    const html = `
      <h1>${post.title}</h1>

      ${authorActions}

      <p>${post.content}</p>
      <p>Автор: <a href="/users/${post.user_id}">${post.username}</a></p>
      <p>Дата: ${formatDate(post.created_at)}</p>

      ${tagsHtml}

      ${commentsHtml}
      ${commentForm}

      <p><a href="/">Вернуться к списку постов</a></p>
    `;

    res.send(layout(post.title, html, req));
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
      `SELECT id, title, content, visibility FROM posts WHERE id = ? AND user_id = ?`,
      [postId, req.session.userId]
    );

    if (posts.length === 0) {
      return res.status(403).send("Вы не можете редактировать этот пост");
    }

    const post = posts[0];

    const html = `
      <h1>Редактирование поста</h1>

      <form method="POST" action="/posts/${post.id}/edit">
        <div>
          <label for="title">Заголовок:</label>
          <input id="title" type="text" name="title" value="${post.title}">
        </div>

        <div>
          <label for="content">Текст поста:</label>
          <textarea id="content" name="content">${post.content}</textarea>
        </div>

        <div>
          <label for="visibility">Видимость:</label>
          <select id="visibility" name="visibility">
            <option value="public" ${post.visibility === "public" ? "selected" : ""}>Публичный пост</option>
            <option value="hidden" ${post.visibility === "hidden" ? "selected" : ""}>Скрытый пост по ссылке</option>
          </select>
        </div>

        <button type="submit">Сохранить изменения</button>
      </form>

      <form method="POST" action="/posts/${post.id}/delete">
        <button type="submit">Удалить пост</button>
      </form>

      <p><a href="/posts/${post.id}">Вернуться к посту</a></p>
      <p><a href="/">На главную</a></p>
    `;

    res.send(layout("Редактирование поста", html, req));
  } catch (error) {
    console.error("Ошибка получения поста для редактирования:", error.message);
    res.status(500).send("Не удалось открыть страницу редактирования");
  }
});

// Сохранение поста после редактирования
router.post("/posts/:id/edit", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { title, content, visibility } = req.body;

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(404).send("Пост не найден");
  }

  if (!title || !content) {
    return res.status(400).send("Заголовок и текст поста должны быть заполнены");
  }

  const postVisibility = visibility === "hidden" ? "hidden" : "public";

  const hiddenToken = postVisibility === "hidden" ? crypto.randomBytes(32).toString("hex") : null;

  try {
    const [result] = await db.query(
      `UPDATE posts
        SET title = ?, content = ?, visibility = ?, hidden_token = ?
        WHERE id = ? AND user_id = ?`,
      [title, content, postVisibility, hiddenToken, postId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).send("Вы не можете редактировать этот пост");
    }

    if (postVisibility === "hidden") {
      return res.send(layout("Пост обновлён", `
        <h1>Пост успешно обновлён и стал скрытым</h1>

        <p>Ссылка для доступа:</p>

        <p>
          <a href="/posts/${postId}?token=${hiddenToken}">
            /posts/${postId}?token=${hiddenToken}
          </a>
        </p>

        <p><a href="/posts/${postId}">Открыть пост как автор</a></p>
        <p><a href="/">На главную</a></p>
      `, req));
    }

    res.redirect(`/posts/${postId}`);
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