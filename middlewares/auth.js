import {formatErrorForResponse} from '../utils/error-utils.js'
import {verify} from '../utils/jwt-utils.js'

function authenticate(req, res, next) {
    try {
        const tokenAuth = req.headers.authorization;
        if (tokenAuth === undefined) {
            throw new Error('No token provided (for authentication)');
        }
        const token = tokenAuth.split(' ')[1];
        const decodedToken = verify(token, req.body.email);
        const userId = decodedToken.userId;
        req.auth = { userId };
        if (req.body.userId && req.body.userId !== userId) {
            throw new Error('Invalid user ID (for authentication)');
        } else {
            next();
        }
    } catch(error) {
        res.status(401).end(formatErrorForResponse(error));
    }
}

export default authenticate;