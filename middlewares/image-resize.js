import fs from 'fs';
import heicConvert from 'heic-convert';
import sharp from 'sharp';
import {POSTS_IMAGES_SAVE_PATH, MIME_TYPES} from '../utils/constants.js'

const POSTS_IMAGES_MAX_LENGTH = 1000;

async function resizeImage(req, res, next) {
    if (! req.file) {
        return next();
    }
    
    const fileRelativePath = `${POSTS_IMAGES_SAVE_PATH}/${req.file.filename}`;
    const tmpFileRelativePath = `${POSTS_IMAGES_SAVE_PATH}/resized-${req.file.filename}`;
    let image;

    if (MIME_TYPES[req.file.mimetype] === 'heic') {
        const inputBuffer = fs.readFileSync(fileRelativePath);
        const outputBuffer = await heicConvert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG',      // output format
            quality: 1           // the jpeg compression quality, between 0 and 1
        });
        image = sharp(outputBuffer);
    } else {
        image = sharp(fileRelativePath);
    }

    let meta = await image.metadata();

    if (meta.width > POSTS_IMAGES_MAX_LENGTH && meta.height > POSTS_IMAGES_MAX_LENGTH) {
        // Resize the image
        try {
            const format = meta.format;
            image.rotate() // rotates the image using the original orientation in the EXIF data
            image.resize(POSTS_IMAGES_MAX_LENGTH, POSTS_IMAGES_MAX_LENGTH, {fit: 'outside'});
            if (format === "jpg" || format === "jpeg") {
                image.jpeg({ quality: 90 });
            } else if (format === "png") {
                image.png({ compressionLevel: 9, adaptiveFiltering: true });
            }
            await image.toFile(tmpFileRelativePath);
        } catch (error) {
            console.error(error);
            return;
        }
        // Check the new file size
        let newSize = 0;
        try {
            newSize = fs.statSync(tmpFileRelativePath).size;
        } catch (error) {
            console.log(error);
        }
        // Keep only one file
        if (req.file.size > newSize) {
            // Replace the old image with the resized one
            fs.unlink(fileRelativePath, (error) => {
                if (error) {
                    console.log("Original image could not be deleted (now trying to delete resized image)");
                    console.error(error);
                    fs.unlink(tmpFileRelativePath, (error) => {
                        console.log("Resized image could not be deleted");
                        console.error(error);
                        throw error;
                    });
                    next();
                    throw error;
                } else {
                    fs.rename(tmpFileRelativePath, fileRelativePath, (error) => {
                        if (error) {
                            console.log("Resized image could not be renamed");
                            console.error(error);
                            throw error;
                        }
                        return next();
                    });
                }
            });
        } else {
            // Delete the resized image and keep the original one
            fs.unlink(tmpFileRelativePath, (error) => {
                if (error) {
                    console.log("Resized image could not be deleted");
                    console.error(error);
                    throw error;
                }
            });
        }
    } else {
        // No need to resize the image
        return next();
    }
}

export default resizeImage;