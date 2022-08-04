import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import {POSTS_IMAGES_SAVE_PATH} from './utils/constants.js'
import userRoutes from './routes/user.js';
import postRoutes from './routes/post.js';

const app = express();

app.use(express.json());

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/images', express.static(path.join(__dirname, POSTS_IMAGES_SAVE_PATH)));

app.use('/api/auth', userRoutes);
app.use('/api/posts', postRoutes);

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});

export default app;