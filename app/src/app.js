const express = require("express");
const session = require("express-session");
const app = express();
const db = require("./db");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
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

app.get("/", async (req, res) => {
  try {
    const [posts] = await db.query(`
      SELECT posts.id, posts.title, posts.content, posts.created_at, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      WHERE posts.visibility = 'public'
      ORDER BY posts.created_at DESC
    `);

    let html = "<h1>Публичные посты</h1>";

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
