import { Router } from 'express';
import { createPost, getPosts, getPost, updatePost, deletePost } from '../controllers/post.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/',     getPosts);              // публичные посты — без авторизации
router.get('/:id',  getPost);              // один пост — логика доступа внутри контроллера
router.post('/',    authenticate, createPost);
router.put('/:id',  authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);

export default router;