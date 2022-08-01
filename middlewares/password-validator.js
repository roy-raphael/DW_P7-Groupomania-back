import passwordValidator from 'password-validator'
import {formatErrorForResponse} from '../utils/error-utils.js'

// Create a schema
var passwordSchema = new passwordValidator();

// Add properties to it
passwordSchema
.is().min(8)                                    // Minimum length 8
.is().max(100)                                  // Maximum length 100
.has().uppercase()                              // Must have uppercase letters
.has().lowercase()                              // Must have lowercase letters
.has().digits(2)                                // Must have at least 2 digits
.has().symbols(2)                               // Must have at least 2 symbols
.has().not().spaces()                           // Should not have spaces

function validatePassword(req, res, next) {
    if (! req.body.password) {
        return next();
    }

    let passwordValidatorErrorsList = passwordSchema.validate(req.body.password, { details: true });
    if (passwordValidatorErrorsList.length === 0) {
        return next();
    } else {
        let errorMessage = "Password too weak.";
        passwordValidatorErrorsList.forEach(element => errorMessage += "\n" + element.message);
        console.log(errorMessage);
        return res.status(403).end(formatErrorForResponse(new Error(errorMessage)));
    }
}

export default validatePassword;