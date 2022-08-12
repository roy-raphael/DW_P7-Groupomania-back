import { Prisma } from '@prisma/client'

function formatErrorForResponse(error) {
    var errorJson = JSON.stringify({error});
    if (errorJson === '{"error":{}}' || !errorJson.includes("message")) {
        errorJson = JSON.stringify({error : {
            name: error.name,
            message: error.message
        }});
    }
    return errorJson;
}

export function handleError(res, wantedStatusCode, error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError
        || error instanceof Prisma.PrismaClientUnknownRequestError
        || error instanceof Prisma.PrismaClientRustPanicError
        || error instanceof Prisma.PrismaClientInitializationError
        || error instanceof Prisma.PrismaClientValidationError) {
            console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    return res.status(wantedStatusCode).end(formatErrorForResponse(error));
}