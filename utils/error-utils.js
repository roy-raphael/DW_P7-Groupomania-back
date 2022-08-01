export function formatErrorForResponse(error) {
    var errorJson = JSON.stringify({error});
    if (errorJson === '{"error":{}}') {
        errorJson = JSON.stringify({error : {
            name: error.name,
            message: error.message
        }});
    }
    return errorJson;
}