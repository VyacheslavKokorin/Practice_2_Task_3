const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const router = express.Router();

router.get("/register", (req, res) => {
  res.send(`
    <h1>Регистрация</h1>

    <form method="POST" action="/register">
      <div>
        <label for="username">Логин:</label>
        <input id="username" name="username" type="text">
      </div>

      <div>
        <label for="email">Email:</label>
        <input id="email" name="email" type="email">
      </div>

      <div>
        <label for="password">Пароль:</label>
        <input id="password" name="password" type="password">
      </div>

      <button type="submit">Зарегистрироваться</button>
    </form>
  `);
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("Все поля должны быть заполнены");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)`,
      [username, email, passwordHash]
    );

    req.session.userId = result.insertId;
    req.session.username = username;

    res.redirect("/");
  } catch (error) {
    console.error("Ошибка регистрации:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).send("Такой логин или email уже существует");
    }

    res.status(500).send("Не удалось зарегистрировать пользователя");
  }
});

router.get("/login", (req, res) => {
  res.send(`
    <h1>Вход</h1>

    <form method="POST" action="/login">
      <div>
        <label for="email">Email:</label>
        <input id="email" name="email" type="email">
      </div>

      <div>
        <label for="password">Пароль:</label>
        <input id="password" name="password" type="password">
      </div>

      <button type="submit">Войти</button>
    </form>
  `);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Введите email и пароль");
  }

  try {
    const [users] = await db.query(
      `SELECT id, username, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).send("Пользователь не найден");
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(400).send("Неверный пароль");
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.redirect("/");
  } catch (error) {
    console.error("Ошибка входа:", error.message);
    res.status(500).send("Не удалось выполнить вход");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Ошибка выхода:", error.message);
      return res.status(500).send("Не удалось выполнить выход");
    }

    res.redirect("/");
  });
});

module.exports = router;