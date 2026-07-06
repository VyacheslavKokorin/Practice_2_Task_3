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

app.get("/", (req, res) => {
  res.send("Blog application is running");
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
