import multer from 'multer';
import fs from 'fs'
import {POSTS_IMAGES_SAVE_PATH, MIME_TYPES} from '../utils/constants.js'

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        if (! fs.existsSync(POSTS_IMAGES_SAVE_PATH)) {
            fs.mkdirSync(POSTS_IMAGES_SAVE_PATH, { recursive: true })
        }
        callback(null, POSTS_IMAGES_SAVE_PATH);
    },
    filename: (req, file, callback) => {
        const fullName = file.originalname.replace(' ', '_');
        const name = fullName.split('.').slice(0, -1).join('.'); // file name without extension
        // const safeReg = /[^\w!#$%&'+\-=^`{}~@.[\]]/g; // keep only letters, digits, and !#$%&'+-=^_`{}~@.[]
        const verySafeReg = /[^\w]/g; // keep only letters, digits, and _
        const nameSafe = name.replace(verySafeReg, '');
        const extension = MIME_TYPES[file.mimetype];
        // Get current date at the format : YYYYMMdd_hhmmss (toISOString gives YYYY-MM-ddThh:mm:ss.zzzZ)
        const dateReg = /[-:]/g;
        var date = new Date(Date.now()).toISOString().replace(dateReg, '').replace('T', '_').split('.').slice(0, -1).join();
        callback(null, nameSafe + '_' + date + '.' + extension);
    }
});

function fileFilter (req, file, callback) {
    if (MIME_TYPES[file.mimetype] === undefined) {
        req.fileValidationError = 'Unsupported mimetype ' + file.mimetype;
        return callback(null, false, new Error(req.fileValidationError));
    }
    callback(null, true);
}

export default multer({storage: storage, fileFilter: fileFilter}).single('image');