const express = require("express");
const requireAuth = require("../middleware/authMiddleware");

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

module.exports = router;