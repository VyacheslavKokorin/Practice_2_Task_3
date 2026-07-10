const express = require("express");
const session = require("express-session");
const app = express();
const db = require("./db");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const usersRoutes = require("./routes/users");
const PORT = 3000;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(authRoutes);
app.use(postsRoutes);
app.use(usersRoutes);

app.get("/", async (req, res) => {
  try {
    const tag = req.query.tag;
    const sort = req.query.sort;

    let sql = `
      SELECT posts.id, posts.title, posts.content, posts.created_at, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
    `;

    const params = [];

    if (tag) {
      sql += `
        JOIN post_tags ON posts.id = post_tags.post_id
        JOIN tags ON post_tags.tag_id = tags.id
      `;
    }

    sql += `
      WHERE posts.visibility = 'public'
    `;

    if (tag) {
      sql += `
        AND tags.name = ?
      `;
      params.push(tag);
    }

    if (sort === "old") {
      sql += `
        ORDER BY posts.created_at ASC
      `;
    } else {
      sql += `
        ORDER BY posts.created_at DESC
      `;
    }

    const [posts] = await db.query(sql, params);

    let html = "<h1>Публичные посты</h1>";

    if (tag) {
      html += `<p>Фильтр по тегу: #${tag}</p>`;
      html += `
        <p>
          Сортировка:
          <a href="/?sort=new">Сначала новые</a> |
          <a href="/?sort=old">Сначала старые</a>
        </p>
      `;
    }

    if (posts.length === 0) {
      html += "<p>Пока нет опубликованных постов.</p>";
    } else {
      for (const post of posts) {
        html += `
          <article>
            <h2>${post.title}</h2>
            <p>${post.content}</p>
            <p>Автор: ${post.username}</p>
            <p>Дата: ${post.created_at}</p>
            <hr>
          </article>
        `;
      }
    }

    res.send(html);
  } catch (error) {
    console.error("Ошибка получения постов:", error.message);
    res.status(500).send("Не удалось получить список постов");
  }
});

app.get("/db-check", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");
    res.json({
      message: "Подключение к БД работает",
      result: rows[0].result
    });
  } catch (error) {
    console.error("Ошибка подключения к БД: ", error.message);
    res.status(500).json({
      message: "Ошибка подключения к БД"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});
