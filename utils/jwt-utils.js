import fs from 'fs';
import jwt from 'jsonwebtoken';
import process from './load-env.js';

const jwtIssuer = process.env.JWT_ISSUER;
const jwtAudience = process.env.JWT_AUDIENCE;
const jwtAccessTokenExpiration = "10m";
const jwtRefreshTokenDefaultExpirationInS = 1 * 24 * 60 * 60; // 1 day
const jwtAlgorithm = "RS256";
var privateKEY = '';
var publicKEY = '';

try {
    // use 'utf8' to get string instead of byte array
    privateKEY = fs.readFileSync(process.env.SEC_RSA_PRIVATE_KEY, 'utf8');
    publicKEY = fs.readFileSync(process.env.SEC_RSA_PUBLIC_KEY, 'utf8');
} catch(error) {
    console.error(error);
    process.kill(process.pid, 'SIGTERM');
}

export function sign(payload, userEmail) {
    var signOptions = {
        issuer:  jwtIssuer,
        subject:  userEmail,
        audience:  jwtAudience,
        expiresIn:  jwtAccessTokenExpiration,
        algorithm:  jwtAlgorithm  
    };
    return jwt.sign(payload, privateKEY, signOptions);
}

export function verify(token, userEmail) {
    var verifyOptions = {
        issuer:  jwtIssuer,
        subject:  userEmail,
        audience:  jwtAudience,
        expiresIn:  jwtAccessTokenExpiration,
        algorithms:  [jwtAlgorithm]
    };
    return jwt.verify(token, publicKEY, verifyOptions);
}

export function signRefresh(payload, userEmail, expirationTimestamp) {
    // If the expirationTimestamp parameter is used, the token must expire at this specific time
    // Else, we use the default value (it may be the first generation of a refresh token)
    const expiresInValue = (expirationTimestamp === undefined) ?
        jwtRefreshTokenDefaultExpirationInS :
        (expirationTimestamp - Math.round(Date.now()/1000));
    var signOptions = {
        issuer:  jwtIssuer,
        subject:  userEmail,
        audience:  jwtAudience,
        expiresIn:  expiresInValue,
        algorithm:  jwtAlgorithm  
    };
    return jwt.sign(payload, privateKEY, signOptions);
}

export function verifyRefresh(token, userEmail) {
    // The expiresIn field does not matter here (but the other fields do)
    var verifyOptions = {
        issuer:  jwtIssuer,
        subject:  userEmail,
        audience:  jwtAudience,
        expiresIn:  jwtRefreshTokenDefaultExpirationInS,
        algorithms:  [jwtAlgorithm]
    };
    return jwt.verify(token, publicKEY, verifyOptions);
}

export function getRefreshTokenInitialExpirationTimestamp() {
    return (jwtRefreshTokenDefaultExpirationInS + Math.round(Date.now()/1000));
}

export function decodePayload(token) {
    // returns only the payload of the token
    // returns null if the token is invalid
    return jwt.decode(token, {complete: false});
}

export function isErrorTokenExpired(error) {
    return (error instanceof jwt.TokenExpiredError);
}