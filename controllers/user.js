import bcrypt from 'bcrypt';
import prisma from "../client.js"
import {loginLimiter, loginConsecutiveLimiter, getFibonacciBlockDurationMinutes} from '../middlewares/rate-limiter.js'
import {handleError} from '../utils/error-utils.js'
import * as jwtUtils from '../utils/jwt-utils.js'

/*
 * @oas [post] /api/auth/signup
 * tags: ["auth"]
 * summary: Creation of a new user
 * description: Hash the user password and add the user to the database
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        $ref: "#/components/schemas/user"
 * security: []
 * responses:
 *  "201":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          type: string
 *          description: User creation message
 *        example: User created
 *  "400":
 *    description: Bad request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// IN : { email: string, password: string }
// OUT: { message: string }
export function signup(req, res, next) {
    // Sanity check
    const userEmail = req.body.email;
    if (userEmail == null) return handleError(res, 400, new Error('No email provided'));
    const userPassword = req.body.password;
    if (userEmail == null) return handleError(res, 400, new Error('No password provided'));
    // Core of the controller
    bcrypt.hash(userPassword, 10)
    .then(hash => {
        const user = {
            email: userEmail,
            password: hash
        };
        prisma.user.create({
            data: user
        })
        .then(() => res.status(201).json({ message: 'User created' }))
        .catch(error => handleError(res, 400, error));
    })
    .catch(error => handleError(res, 500, error));
}

/*
 * @oas [post] /api/auth/login
 * tags: ["auth"]
 * summary: Connexion of a user
 * description: >
 *  Check of the user identification informations, return the id of the user from
 *  the database and 2 signed JSON web tokens (an access token, and a refresh token).
 *  If a refresh token is in the authorization headers of the request, it is revoked from the database.
 *  The number of (failed) attempts to connect for a user is limited (in the time as well).
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        $ref: "#/components/schemas/user"
 * security:
 *  - {bearerAuth: []}
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            userId:
 *              type: string
 *              description: ID of the user (from the database)
 *            accessToken:
 *              type: string
 *              description: signed access token (containing the user ID)
 *            refreshToken:
 *              type: string
 *              description: signed refresh token (containing the user ID and the refresh token ID stored in the database)
 *        example:
 *          userId: e5268c386c9b17c39bd6a17d
 *          accessToken: ...
 *          refreshToken: ...
 *  "400":
 *    description: Bad request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "429":
 *    description: Too Many Request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// IN : { email: string, password: string } OR { email: string, password: string, refreshToken: string }
// OUT: { userId: string, accessToken: string, refreshToken: string }
export function login(req, res, next) {
    // Sanity check
    const userEmail = req.body.email;
    if (userEmail == null) return handleError(res, 400, new Error('No email provided'));
    const userPassword = req.body.password;
    if (userEmail == null) return handleError(res, 400, new Error('No password provided'));
    const userRefreshToken = req.body.refreshToken; // optional field
    // Core of the controller
    prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, password: true }})
    .then(async user => {
        if (!user) {
            return handleError(res, 401, new Error('User not found'));
        }
        // Sign in the user
        bcrypt.compare(userPassword, user.password)
        .then(async valid => {
            if (valid) {
                // Store an id (relative to the refresh token) in the database with the user's information (userId) and expiration date
                const refreshTokenExpirationTimestamp = jwtUtils.getRefreshTokenInitialExpirationTimestamp();
                prisma.refreshToken.create({
                    data: {
                        expirationDate: new Date(refreshTokenExpirationTimestamp * 1000),
                        userId: user.id
                    },
                    select: { id: true }
                })
                .then(async refreshTokenData => {
                    // Sign the access token and the refresh token
                    var accessToken = jwtUtils.sign({ userId: user.id }, userEmail);
                    var refreshToken = jwtUtils.signRefresh({ userId: user.id, refreshTokenId: refreshTokenData.id }, userEmail, refreshTokenExpirationTimestamp);
                    // Before sending the response, delete the old refresh token id (if login was send with a token)
                    if (userRefreshToken) {
                        const oldRefreshTokenPayload = jwtUtils.decodePayload(userRefreshToken);
                        if (oldRefreshTokenPayload === null) {
                            return handleError(res, 400, new Error('Invalid optional token provided (for login)'));
                        }
                        const oldRefreshTokenId = oldRefreshTokenPayload.refreshTokenId;
                        if (oldRefreshTokenId === undefined) {
                            return handleError(res, 400, new Error('No refreshTokenId in optional token provided (for login)'));
                        }
                        prisma.refreshToken.findUnique({ where: { id: oldRefreshTokenId } })
                        .then(oldRefreshTokenData => {
                            if (oldRefreshTokenData) {
                                prisma.refreshToken.delete({ where: { id: oldRefreshTokenId } })
                                .catch(error => console.error("Refresh token data could not be deleted from database : " + error));
                            }
                        })
                        .catch(error => console.error("Refresh token data could not be deleted from database : " + error));
                    }
                    // Send the response
                    res.status(200).json({
                        userId: user.id,
                        accessToken: accessToken,
                        refreshToken: refreshToken
                    });
                    // Update the login rate limiters (only if the bcrypt.compare function doesn't fail)
                    await loginConsecutiveLimiter.delete(userEmail);
                })
                .catch(error => handleError(res, 500, error));                
            } else {
                // Update the login rate limiters (only if the bcrypt.compare function doesn't fail)
                let blockDurationSeconds = 1; // initial value (for default blocking)
                try {
                    const userConsecutiveLimiterRes = await loginConsecutiveLimiter.get(userEmail);
                    const globalConsumedPoints = userConsecutiveLimiterRes == null ? 1 : 5;
                    const resConsume = await loginLimiter.consume(userEmail, globalConsumedPoints);
                    if (resConsume.remainingPoints <= 0) {
                        const resPenalty = await loginConsecutiveLimiter.penalty(userEmail);
                        blockDurationSeconds = 60 * getFibonacciBlockDurationMinutes(resPenalty.consumedPoints);
                        await loginLimiter.block(userEmail, blockDurationSeconds);
                    }
                } catch (rlRejected) {
                    if (rlRejected instanceof Error) {
                        throw rlRejected;
                    } else {
                        blockDurationSeconds = Math.round(rlRejected.msBeforeNext / 1000);
                    }
                }
                res.set('Retry-After', String(blockDurationSeconds) || 1);
                return handleError(res, 401, new Error('Incorrect password'));
            }
        })
        .catch(error => handleError(res, 500, error));
    })
    .catch(error => handleError(res, 500, error));
}

/*
 * @oas [post] /api/auth/refresh
 * tags: ["auth"]
 * summary: Retrieve a new access token from a refresh token
 * description: >
 *  Checks the refresh token validity and its validity in the database,
 *  and sends back a new access token and a new refresh token if all is fine.
 *  Else, revokes the refresh token ID in the database, so other users with the same
 *  refresh token ID won't be able to get access tokens from this refresh token ID.
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        type: object
 *        properties:
 *          refreshToken:
 *            type: string
 *            description: signed refresh token (containing the user ID and the refresh token ID stored in the database)
 *      example:
 *        refreshToken: ...
 * security: []
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            userId:
 *              type: string
 *              description: ID of the user (from the database)
 *            accessToken:
 *              type: string
 *              description: signed access token (containing the user ID)
 *            refreshToken:
 *              type: string
 *              description: signed refresh token (containing the user ID and the refresh token ID stored in the database)
 *        example:
 *          userId: e5268c386c9b17c39bd6a17d
 *          accessToken: ...
 *          refreshToken: ...
 *  "400":
 *    description: Bad Request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// IN : { refreshToken: string }
// OUT: { userId: string, accessToken: string, refreshToken: string }
export async function refresh(req, res, next) {
    // Sanity check
    const refreshToken = req.body.refreshToken;
    if (refreshToken == null) return handleError(res, 400, new Error('No refresh token provided'));
    // Core of the controller
    try {
        const refreshTokenPayload = jwtUtils.decodePayload(refreshToken);
        if (refreshTokenPayload === null) {
            throw new Error('Invalid token provided (for refresh)');
        }
        const refreshTokenId = refreshTokenPayload.refreshTokenId;
        if (refreshTokenId === undefined) {
            throw new Error('Incomplete (missing data) token (for refresh)');
        }
        prisma.refreshToken.findUnique({
            where: { id: refreshTokenId },
            include: { 
                user: true
            }
        })
        .then(refreshTokenData => {
            if (refreshTokenData) {
                const user = refreshTokenData.user;
                if (!user) {
                    return handleError(res, 401, new Error("No user exists for this token"));
                }
                try {
                    jwtUtils.verifyRefresh(refreshToken, user.email);
                } catch(error) {
                    // If the token is expired : delete it from the database
                    if (jwtUtils.isErrorTokenExpired(error)) {
                        prisma.refreshToken.delete({ where: { id: refreshTokenId } })
                        .catch(error => console.error("Refresh token data could not be deleted from database : " + error));
                    }
                    // The token is invalid : return an authentication error
                    return handleError(res, 401, new Error("Refresh token invalid"));
                }
                // The refresh token is valid : return new access and refresh tokens
                var accessToken = jwtUtils.sign({ userId: user.id }, user.email);
                const expirationTimestamp = Math.round(refreshTokenData.expirationDate.getTime()/1000);
                var newRefreshToken = jwtUtils.signRefresh({ userId: user.id, refreshTokenId: refreshTokenData.id }, user.email, expirationTimestamp);
                res.status(200).json({
                    userId: user.id,
                    accessToken: accessToken,
                    refreshToken: newRefreshToken
                });
            } else {
                // If the refresh token is not found on database : it has already been used (or it has expired)
                const refreshTokenPayload = jwtUtils.decodePayload(refreshToken);
                if (refreshTokenPayload === null) {
                    return handleError(res, 400, new Error("Invalid token provided (for refresh)"));
                }
                const decodedPayloadUserId = refreshTokenPayload.userId;
                // Get email from database with the user ID
                prisma.user.findUnique({ where: { id: decodedPayloadUserId }, select: { email: true }})
                .then(user => {
                    if (!user) {
                        return handleError(res, 401, new Error("No user exists for this token"));
                    }
                    try {
                        jwtUtils.verifyRefresh(refreshToken, user.email);
                        // If the token is valid, remove from the database all the refresh tokens for this user ID
                    } catch(error) {
                        if (jwtUtils.isErrorTokenExpired(error)) {
                            // If the refresh token is expired : we only send an authentication error
                            return handleError(res, 401, new Error("Refresh token expired"));
                        }
                        // If the token could not be validated, its data may have been modified...
                        // In doubt, remove from the database all the tokens for this user ID
                    }
                    prisma.refreshToken.deleteMany({ where: { userId: decodedPayloadUserId } })
                    .catch(error => console.error("Refresh tokens could not be deleted from database" + error));
                    return handleError(res, 401, new Error("Refresh token already used"));
                })
                .catch(error => handleError(res, 500, error));
            }
        })
        .catch(error => handleError(res, 500, error));
    } catch(error) {
        handleError(res, 400, error);
    }
}

/*
 * @oas [post] /api/auth/logout
 * tags: ["auth"]
 * summary: Disconnexion of a user to revoke the current refresh token
 * description: >
 *  Checks the refresh token payload and revokes its ID in the database, so other users with
 *  the same refresh token ID won't be able to get access tokens from this refresh token ID.
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        type: object
 *        properties:
 *          refreshToken:
 *            type: string
 *            description: signed refresh token (containing the user ID and the refresh token ID stored in the database)
 *      example:
 *        refreshToken: ...
 * security: []
 * responses:
 *  "204":
 *    description: OK
 *  "400":
 *    description: Bad Request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// IN : { refreshToken: string }
export async function logout(req, res, next) {
    // Sanity check
    const refreshToken = req.body.refreshToken;
    if (refreshToken == null) return handleError(res, 400, new Error('No refresh token provided'));
    // Core of the controller
    try {
        const refreshTokenPayload = jwtUtils.decodePayload(refreshToken);
        if (refreshTokenPayload === null) {
            throw new Error('Invalid token provided (for logout)');
        }
        const decodedPayloadRefreshTokenId = refreshTokenPayload.refreshTokenId;
        // Delete the refresh token in database, no matter if it is valid or not
        if (decodedPayloadRefreshTokenId !== undefined) {
            prisma.refreshToken.delete({ where: { id: decodedPayloadRefreshTokenId } })
            .then(() => res.status(204).end())
            .catch(() => handleError(res, 500, new Error("Refresh tokens could not be deleted from database")));
        } else {
            throw new Error('No refreshTokenId in token provided (for logout)');
        }
    } catch(error) {
        handleError(res, 400, error);
    }
}