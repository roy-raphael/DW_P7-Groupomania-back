import prisma from "../client.js"
import {formatErrorForResponse} from '../utils/error-utils.js'

// Check if the user has the right to modify the post
function postAuthorize(req, res, next) {
    prisma.post.findUnique({ where: { id: req.params.id }})
    .then((post) => {
        if (!post) {
            res.status(404).json({ message: 'No post found with this ID'})
        }
        else if (post.authorId !== req.auth.userId) {
            res.status(403).json({ message: 'Unauthorized request'})
        }
        else {
            req.post = post;
            next();
        }
    })
    .catch(error => res.status(500).end(formatErrorForResponse(error)));
}

export default postAuthorize;