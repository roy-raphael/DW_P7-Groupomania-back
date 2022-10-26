import prisma from "../client.js"
import {handleError} from '../utils/error-utils.js'

// Check if the user has the right to modify the post
function postAuthorize(req, res, next) {
    prisma.post.findUnique({ where: { id: req.params.id }})
    .then((post) => {
        if (!post) {
            return handleError(res, 404, new Error('No post found with this ID'));
        }
        else if (post.authorId !== req.auth.userId) {
            return handleError(res, 403, new Error('Unauthorized request'));
        }
        else {
            req.post = post;
            next();
        }
    })
    .catch(error => handleError(res, 500, error));
}

export default postAuthorize;