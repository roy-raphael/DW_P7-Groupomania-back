import express from 'express';
import auth from '../middlewares/auth.js';
import postAuthorize from '../middlewares/post-auth.js';
import multer from '../middlewares/multer-config.js';
import resizeImage from '../middlewares/image-resize.js';
import * as postCtrl  from '../controllers/post.js';

const router = express.Router();

router.get('/', auth, postCtrl.getAllPosts);
router.post('/', auth, multer, resizeImage, postCtrl.createPost);
router.get('/:id', auth, postCtrl.getOnePost);
router.put('/:id', auth, postAuthorize, multer, resizeImage, postCtrl.modifyPost);
router.delete('/:id', auth, postAuthorize, postCtrl.deletePost);
router.post('/:id/comment', auth, postCtrl.commentPost);
router.post('/:id/like', auth, postCtrl.likePost);

export default router;