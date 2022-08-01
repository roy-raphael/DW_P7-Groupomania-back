import express from 'express';
import * as userCtrl  from '../controllers/user.js';
import validatePassword from '../middlewares/password-validator.js';
import {loginRateLimiter} from '../middlewares/rate-limiter.js'

const router = express.Router();

router.post('/signup', validatePassword, userCtrl.signup);
router.post('/login', loginRateLimiter, userCtrl.login);

export default router;