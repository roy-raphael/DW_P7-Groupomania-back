import prisma from "../client.js"
import bcrypt from 'bcrypt';
import {loginLimiter, loginConsecutiveLimiter, getFibonacciBlockDurationMinutes} from '../middlewares/rate-limiter.js'
import {formatErrorForResponse} from '../utils/error-utils.js'
import {sign} from '../utils/jwt-utils.js'

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
import { Prisma } from '@prisma/client'
export function signup(req, res, next) {
    bcrypt.hash(req.body.password, 10)
    .then(hash => {
        const user = {
            email: req.body.email,
            password: hash
        };
        prisma.user.create({
            data: user
        })
        .then(() => res.status(201).json({ message: 'User created' }))
        .catch(error => res.status(400).end(formatErrorForResponse(error)));
    })
    .catch(error => res.status(500).end(formatErrorForResponse(error)));
}

/*
 * @oas [post] /api/auth/login
 * tags: ["auth"]
 * summary: Connexion of a user
 * description: >
 *  Check of the user identification informations, return the _id of the user from
 *  the database and a signed JSON web token (containing the _id of the user).
 *  The number of (failed) attempts to connect for a user is limited (in the time as well).
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        $ref: "#/components/schemas/user"
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
 *              description: ID de l'utilisateur (depuis la base de données)
 *            token:
 *              type: string
 *              description: token web JSON signé (contenant également l'ID de l'utilisateur)
 *        example:
 *          userId: e5268c386c9b17c39bd6a17d
 *          token: ...
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
// IN : { email: string, password: string }
// OUT: { userId: string, token: string }
export function login(req, res, next) {
    const userEmail = req.body.email;
    prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, password: true }})
    .then(async user => {
        if (!user) {
            return res.status(401).end(formatErrorForResponse(new Error('User not found')));
        }
        // Sign in the user
        bcrypt.compare(req.body.password, user.password)
        .then(async valid => {
            if (valid) {
                var token = sign({ userId: user.id }, userEmail);
                res.status(200).json({
                    userId: user.id,
                    token: token
                });
                // Update the login rate limiters (only if the bcrypt.compare function doesn't fail)
                await loginConsecutiveLimiter.delete(userEmail);
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
                res.status(401).end(formatErrorForResponse(new Error('Incorrect password')));
            }
        })
        .catch(error => res.status(500).end(formatErrorForResponse(error)));
    })
    .catch(error => res.status(500).end(formatErrorForResponse(error)));
}