function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("Для выполнения этого действия нужно войти в аккаунт");
  }

  next();
}

module.exports = requireAuth;