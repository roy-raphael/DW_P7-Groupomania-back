import bcrypt from 'bcrypt';
import prisma from "../client.js"
import {loginLimiter, loginConsecutiveLimiter, getFibonacciBlockDurationMinutes} from '../middlewares/rate-limiter.js'
import {handleError} from '../utils/error-utils.js'
import * as jwtUtils from '../utils/jwt-utils.js'

const EMAIL_REGEXP = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
const PASSWORD_AUTHORIZED_CHARACTERS = /[^\w\d `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/g;

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
 *        type: object
 *        description: data needed for a user creation
 *        properties:
 *          email:
 *            type: string
 *            description: e-mail adress of the user [unique]
 *          password:
 *            type: string
 *            description: hashed user password
 *          firstName:
 *            type: string
 *            description: first name of the user
 *          surName:
 *            type: string
 *            description: surname of the user
 *          pseudo:
 *            type: string
 *            description: pseudonym of the user
 *        required:
 *          - email
 *          - password
 *          - firstName
 *          - surName
 *        example:
 *          email: my-email-adress@email.com
 *          password: MY-p@ssw0rd2
 *          firstName: Peter
 *          surName: Smith
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
 *          $ref: "#/components/schemas/error"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
 */
// IN : { email: string, password: string, firstName: string, surName: string }
//   OR { email: string, password: string, firstName: string, surName: string, pseudo: string }
// OUT: { message: string }
export function signup(req, res, next) {
    // Sanity check
    const userEmail = req.body.email;
    if (userEmail == null) return handleError(res, 400, new Error('No email provided'));
    const userPassword = req.body.password;
    if (userEmail == null) return handleError(res, 400, new Error('No password provided'));
    const userFirstName = req.body.firstName;
    if (userEmail == null) return handleError(res, 400, new Error('No firstName provided'));
    const userSurName = req.body.surName;
    if (userEmail == null) return handleError(res, 400, new Error('No surName provided'));
    const userPseudo = req.body.pseudo; // optional
    
    // Sanity check
    if (!userEmail.match(EMAIL_REGEXP)) {
        return handleError(res, 400, new Error('Wrong email provided (sanity check failed)'));
    }
    if (userPassword.match(PASSWORD_AUTHORIZED_CHARACTERS)) {
        return handleError(res, 400, new Error('Wrong password provided (sanity check failed)'));
    }

    // Core of the controller
    bcrypt.hash(userPassword, 10)
    .then(hash => {
        var user = {
            email: userEmail,
            password: hash,
            firstName: userFirstName,
            surName: userSurName
        };
        if (userPseudo) user['pseudo'] = userPseudo;
        prisma.user.create({
            data: user
        })
        .then(() => res.status(201).json({ message: 'User created' }))
        .catch(error => handleError(res, 500, error));
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
 *        type: object
 *        description: data needed for log in a user
 *        properties:
 *          email:
 *            type: string
 *            description: e-mail adress of the user [unique]
 *          password:
 *            type: string
 *            description: hashed user password
 *          refreshToken:
 *            type: string
 *            description: current refresh token of the user
 *        required:
 *          - email
 *          - password
 *        example:
 *          email: my-email-adress@email.com
 *          password: MY-p@ssw0rd2
 * security: []
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/user-credentials"
 *  "400":
 *    description: Bad request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          description: Error object containing a message and optionally a number of seconds to wait before a retry
 *          properties:
 *            error:
 *              $ref: "#/components/schemas/errorObject"
 *            reftyAfter:
 *              type: number
 *              description: number of seconds to wait before retrying the login
 *          required:
 *            - error
 *          example:
 *            error:
 *              name: Error
 *              message: Incorrect password
 *  "429":
 *    description: Too Many Request
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          description: Error object containing a message and a number of seconds to wait before a retry
 *          properties:
 *            error:
 *              $ref: "#/components/schemas/errorObject"
 *            reftyAfter:
 *              type: number
 *              description: number of seconds to wait before retrying the login
 *          example:
 *            error:
 *              name: Error
 *              message: Too Many Requests
 *            reftyAfter: 60
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
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
    prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, email: true, password: true, firstName: true, surName: true, pseudo: true, role: true }})
    .then(async userWithPassword => {
        if (!userWithPassword) {
            return handleError(res, 401, new Error('User not found'));
        }
        var user = {...userWithPassword};
        delete user['password'];
        if (! user.pseudo) delete user['pseudo'];
        // Sign in the user
        bcrypt.compare(userPassword, userWithPassword.password)
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
                    res.status(200).json({ user, accessToken, refreshToken });
                    // Update the login rate limiters (only if the bcrypt.compare function doesn't fail)
                    await loginConsecutiveLimiter.delete(userEmail);
                })
                .catch(error => handleError(res, 500, error));                
            } else {
                // Update the login rate limiters (only if the bcrypt.compare function doesn't fail)
                let blockDurationSeconds = 0;
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
                if (blockDurationSeconds > 0) {
                    res.set('Retry-After', String(blockDurationSeconds) || 1);
                    return res.status(401).json({  error: {name: 'Error', message: 'Incorrect password'}, retryAfter: blockDurationSeconds });
                } else {
                    return handleError(res, 401, new Error('Incorrect password'));
                }
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
 *          $ref: "#/components/schemas/user-credentials"
 *  "400":
 *    description: Bad Request
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
 */
// IN : { refreshToken: string }
// OUT: { userId: string, accessToken: string, refreshToken: string }
export async function refresh(req, res, next) {
    // Sanity check
    const receivedRefreshToken = req.body.refreshToken;
    if (receivedRefreshToken == null) return handleError(res, 400, new Error('No refresh token provided'));
    // Core of the controller
    try {
        const refreshTokenPayload = jwtUtils.decodePayload(receivedRefreshToken);
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
                if (!refreshTokenData.user) {
                    return handleError(res, 401, new Error("No user exists for this token"));
                }
                var user = {...refreshTokenData.user};
                const userEmail = user.email;
                delete user['password'];
                const refreshTokenExpirationDate = refreshTokenData.expirationDate;
                // Delete the token from the database, because it is being used (no matter if valid or not)
                prisma.refreshToken.delete({ where: { id: refreshTokenId } })
                .catch(error => console.error("Refresh token data could not be deleted from database : " + error));
                try {
                    jwtUtils.verifyRefresh(receivedRefreshToken, userEmail);
                } catch(error) {
                    // The token is invalid : return an authentication error
                    return handleError(res, 401, new Error("Refresh token invalid"));
                }
                // The refresh token is valid : store a new refreshToken entry in the database (with the same expiration date),
                // then return new access and refresh tokens
                prisma.refreshToken.create({
                    data: {
                        expirationDate: refreshTokenExpirationDate,
                        userId: user.id
                    },
                    select: { id: true }
                })
                .then(async newRefreshTokenData => {
                    // Sign the access token and the refresh token
                    var accessToken = jwtUtils.sign({ userId: user.id }, userEmail);
                    const expirationTimestamp = Math.round(refreshTokenExpirationDate.getTime()/1000);
                    var refreshToken = jwtUtils.signRefresh({ userId: user.id, refreshTokenId: newRefreshTokenData.id }, userEmail, expirationTimestamp);
                    // Send the response
                    res.status(200).json({ user, accessToken, refreshToken });
                })
                .catch(error => handleError(res, 500, error));
            } else {
                // If the refresh token is not found on database : it has already been used (or it has expired)
                const refreshTokenPayload = jwtUtils.decodePayload(receivedRefreshToken);
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
                        jwtUtils.verifyRefresh(receivedRefreshToken, user.email);
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
 *          $ref: "#/components/schemas/error"
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/error"
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