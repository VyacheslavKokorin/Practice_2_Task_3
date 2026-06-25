import 'dotenv/config';
import app from './app.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});