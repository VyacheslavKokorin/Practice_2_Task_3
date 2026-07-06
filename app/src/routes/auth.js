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

    await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );

    res.send("Пользователь успешно зарегистрирован");
  } catch (error) {
    console.error("Ошибка регистрации:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).send("Такой логин или email уже существует");
    }

    res.status(500).send("Не удалось зарегистрировать пользователя");
  }
});

module.exports = router;