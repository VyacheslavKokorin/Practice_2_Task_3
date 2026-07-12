function layout(title, content, req) {
  let authLinks = "";

  if (req.session.userId) {
    authLinks = `
      <span>Вы вошли как ${req.session.username}</span>
      <a href="/users/${req.session.userId}">Мой профиль</a>
      <a href="/posts/create">Создать пост</a>
      <a href="/feed">Лента подписок</a>
      <a href="/logout">Выйти</a>
    `;
  } else {
    authLinks = `
      <a href="/register">Регистрация</a>
      <a href="/login">Вход</a>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <header>
        <nav>
          <a href="/">Главная</a>
          <a href="/users">Пользователи</a>
          ${authLinks}
        </nav>
      </header>

      <main>
        ${content}
      </main>
    </body>
    </html>
  `;
}

module.exports = layout;