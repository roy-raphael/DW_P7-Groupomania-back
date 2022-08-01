import dotenv from 'dotenv';

const result = dotenv.config();

// Check if the dotenv file could be read
if (result.error) {
    throw result.error;
}

// Check the dotenv file
let dotenvMissingVariables = [];
if (process.env.DATABASE_URL === undefined) dotenvMissingVariables.push("DATABASE_URL");
if (process.env.RSA_PRIVATE_KEY === undefined) dotenvMissingVariables.push("RSA_PRIVATE_KEY");
if (process.env.RSA_PUBLIC_KEY === undefined) dotenvMissingVariables.push("RSA_PUBLIC_KEY");
if (process.env.JWT_ISSUER === undefined) dotenvMissingVariables.push("JWT_ISSUER");
if (process.env.JWT_AUDIENCE === undefined) dotenvMissingVariables.push("JWT_AUDIENCE");
if (dotenvMissingVariables.length !== 0) {
    let errorMessage = "DOTENV file not complete (missing : ";
    dotenvMissingVariables.forEach(element => errorMessage += element + ", ");
    let err = new Error(errorMessage.split(', ').slice(0, -1).join(', ') + ")");
    throw err;
}

export default process;