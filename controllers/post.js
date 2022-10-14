import fs from 'fs';
import prisma from "../client.js"
import {POSTS_IMAGES_SAVE_PATH} from '../utils/constants.js'
import {handleError} from '../utils/error-utils.js'

/*
 * @oas [get] /api/posts
 * tags: ["posts"]
 * summary: Find all posts
 * description: Returns an array of all the posts in the database
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          type: array
 *          items:
 *            $ref: "#/components/schemas/post"
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
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// OUT: Array of posts, with a descending order (more recent first)
export function getAllPosts(req, res, next) {
    const limit = parseInt(req.query.limit);
    const before = req.query.before;
    const prismaWhereContent = before ? { createdAt: { lt: before } } : undefined;
    prisma.post.findMany({
        where: prismaWhereContent,
        include: {
            author: {
                select: {
                    firstName: true,
                    surName: true,
                    pseudo: true
                }
            },
            likes: {
                select: {
                    id: true
                }
            },
            dislikes: {
                select: {
                    id: true
                }
            },
            comments: true
        },
        orderBy: [
            {
                createdAt: 'desc',
            }
        ],
        take: limit ? limit : undefined
    })
    .then(posts => res.status(200).json(posts))
    .catch(error => handleError(res, 400, error));
}

/*
 * @oas [post] /api/posts
 * tags: ["posts"]
 * summary: Creation of a new post
 * description: >
 *  Creates a post with a text and with or without an image (and with empty likes and dislikes arrays).
 *  If an image is uploaded, it is captured, and the imageUrl of the post is initialized.
 *  If no file is submitted, the informations of the post are in the root of the request body.
 *  If a file is submitted, the post (string) is in req.body.post
 *  The initial request body is empty ; multer returns a string for the request body
 *  with the data submitted with the file.
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        $ref: "#/components/schemas/post-form"
 *    multipart/form-data:
 *      schema:
 *        type: object
 *        properties:
 *          post:
 *            $ref: "#/components/schemas/post-form-with-image"
 *          file:
 *            type: string
 *            format: binary
 *            description: image to upload
 * responses:
 *  "201":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/post"
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
 *  "415":
 *    description: Unsupported Media Type
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
// IN : EITHER Post as JSON OR { post: String, image: File }
// OUT: Single post (the one created)
export function createPost(req, res, next) {
    if (req.fileValidationError) {
        return handleError(res, 415, new Error(req.fileValidationError));
    }
    const postObject = req.file ?
        {
            ...JSON.parse(req.body.post),
            imageUrl: `${req.protocol}://${req.get('host')}/${POSTS_IMAGES_SAVE_PATH}/${req.file.filename}`
        } : { ...req.body };
    if ( req.file && !postObject.imageAlt ) {
        deleteImage(postObject.imageUrl);
        handleError(res, 400, new Error("No imageAlt property found (during post creation with an image file)"));
    } else {
        prisma.post.create({
            data: postObject
        })
        .then(post => res.status(201).json(post))
        .catch(error => {
            if (req.file) {
                deleteImage(postObject.imageUrl);
            }
            handleError(res, 400, error)
        });
    }
}

/*
 * @oas [get] /api/posts/{id}
 * tags: ["posts"]
 * summary: Finds a post by ID
 * description: Returns the post with the given id
 * parameters:
 *  - $ref: "#/components/parameters/postIdParam"
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/post"
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "404":
 *    description: Not Found
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
// OUT: Single post
export function getOnePost(req, res, next) {
    prisma.post.findUnique({ 
        where: {
            id: req.params.id
        },
        include: { 
            author: {
                select: {
                    firstName: true,
                    surName: true,
                    pseudo: true
                }
            },
            likes: {
                select: {
                    id: true
                }
            },
            dislikes: {
                select: {
                    id: true
                }
            },
            comments: true
        }
    })
    .then(post => {
        if (!post) {
            return handleError(res, 404, new Error('Post not found'));
        }
        res.status(200).json(post)
    })
    .catch(error => handleError(res, 500, error));
}

/*
 * @oas [put] /api/posts/{id}
 * tags: ["posts"]
 * summary: Modification of a post
 * description: >
 *  Update the post with the id submitted.
 *  If an image is uploaded, it is captured, and the imageUrl of the post is updated.
 *  If no file is submitted, the informations of the post are in the root of the request body.
 *  If a file is submitted, the post (string) is in req.body.post
 *  The initial request body is empty ; multer returns a string for the request body
 *  with the data submitted with the file.
 * parameters:
 *  - $ref: "#/components/parameters/postIdParam"
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        $ref: "#/components/schemas/post-form"
 *    multipart/form-data:
 *      schema:
 *        type: "object"
 *        properties:
 *          post:
 *            $ref: "#/components/schemas/post-form-with-image"
 *          file:
 *            type: string
 *            format: binary
 *            description: image to upload
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/post"
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
 *  "403":
 *    description: Forbidden
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "404":
 *    description: Not Found
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "415":
 *    description: Unsupported Media Type
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
// IN : EITHER Post as JSON OR { post: String, image: File }
// OUT: Single post (the one modified)
export function modifyPost(req, res, next) {
    if (req.fileValidationError) {
        return handleError(res, 415, new Error(req.fileValidationError));
    }
    const postObject = req.file ?
        {
            ...JSON.parse(req.body.post),
            imageUrl: `${req.protocol}://${req.get('host')}/${POSTS_IMAGES_SAVE_PATH}/${req.file.filename}`
        } : { ...req.body };
    if ( req.file && !postObject.imageAlt ) {
        deleteImage(postObject.imageUrl);
        handleError(res, 400, new Error("No imageAlt property found (during post modification with an image file)"));
    } else {
        prisma.post.update({
            where: { id: req.params.id },
            data: postObject
        })
        .then(post => {
            if (req.file && req.post.imageUrl) {
                deleteImage(req.post.imageUrl);
            }
            res.status(200).json(post);
        })
        .catch(error => {
            if (req.file) {
                deleteImage(postObject.imageUrl);
            }
            handleError(res, 400, error)
        });
    }
}

/*
 * @oas [delete] /api/posts/{id}
 * tags: ["posts"]
 * summary: Deletion of a post
 * description: Delete the post with the given id
 * parameters:
 *  - $ref: "#/components/parameters/postIdParam"
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          type: string
 *          description: Post deletion message
 *        example: Post deleted
 *  "401":
 *    description: Unauthorized
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "403":
 *    description: Forbidden
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 *  "404":
 *    description: Not Found
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
// OUT: { message: String }
export function deletePost(req, res, next) {
    if (req.post.imageUrl) {
        deleteImage(req.post.imageUrl);
    }
    prisma.post.delete({ where: { id: req.params.id } })
    .then(() => res.status(200).json({ message: 'Post deleted'}))
    .catch(error => handleError(res, 401, error));
}

/*
 * @oas [post] /api/posts/{id}/comment
 * tags: ["posts"]
 * summary: Creation of a new comment to an existing post
 * description: >
 *  Creates a comment (text) relative to a post (with the comment's authors' ID)
 * parameters:
 *  - $ref: "#/components/parameters/postIdParam"
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        type: "object"
 *        properties:
 *          text:
 *            type: string
 *            description: Text content of the comment
 *          authorId:
 *            type: string
 *            description: ID of the author of the comment
 *      example:
 *        text: This is a comment
 *        authorId: e5268c386c9b17c39bd6a17d
 * responses:
 *  "200":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/comment"
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
 *  "500":
 *    description: Internal Server Error
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/errorMessage"
 */
// IN : { text: String, authorId: String }
// OUT: Single comment (the one created)
export function commentPost(req, res, next) {
    prisma.comment.create({
        data: {
            ...req.body,
            postId: req.params.id
        }
    })
    .then(comment => res.status(201).json(comment))
    .catch(error => handleError(res, 400, error));
}

/*
 * @oas [post] /api/posts/{id}/like
 * tags: ["posts"]
 * summary: Sets the like status of a post for a user
 * description: >
 *  Define the "like" status of a given user for a post
 *  If like = 1, the user likes the post.
 *  If like = 0, the user cancels its like or dislike (neutral).
 *  If like = -1, the user dislikes the post.
 *  The ID of the user is added (and/or removed) to the right array.
 *  A user can only have one (and only one) value for each post.
 * parameters:
 *  - $ref: "#/components/parameters/postIdParam"
 * requestBody:
 *  required: true
 *  content:
 *    application/json:
 *      schema:
 *        type: "object"
 *        properties:
 *          userId:
 *            type: string
 *            description: ID of the user
 *          like:
 *            type: number
 *            description: new like status of the post for the user (-1 dislike / 0 neutral / 1 like)
 *            minimum: -1
 *            maximum: 1
 *            enum: [-1, 0, 1]
 *      example:
 *        userId: e5268c386c9b17c39bd6a17d
 *        like: 1
 * responses:
 *  "201":
 *    description: OK
 *    content:
 *      application/json:
 *        schema:
 *          $ref: "#/components/schemas/post"
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
 *  "404":
 *    description: Not Found
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
// IN : { userId: String, like: Number }
// OUT: Single post (the one liked)
export function likePost(req, res, next) {
    prisma.post.findUnique({ 
        where: {
            id: req.params.id
        },
        include: {
            likes: {
                select: {
                    id: true
                }
            },
            dislikes: {
                select: {
                    id: true
                }
            }
        }
    })
    .then(post => {
        if (! post) {
            return res.status(404).json({ message: 'No post found with this ID'})
        }
        let likeConnect = [];
        let likeDisconnect = [];
        let dislikeConnect = [];
        let dislikeDisconnect = [];
        let id = req.body.userId;
        // Search the user in the likes/dislikes arrays and
        // remove the old like/dislike if found
        if (post.likes.findIndex(user => user.id === id) != -1) {
            likeDisconnect = { id };
        }
        if (post.dislikes.findIndex(user => user.id === id) != -1) {
            dislikeDisconnect = { id };
        }
        // Add the new like/dislike
        if (req.body.like === 1) {
            likeConnect = { id };
        } else if (req.body.like === -1) {
            dislikeConnect = { id };
        }
        prisma.post.update({
            where: { id: req.params.id },
            data: {
                likes: {
                    connect : likeConnect,
                    disconnect: likeDisconnect
                },
                dislikes: {
                    connect : dislikeConnect,
                    disconnect: dislikeDisconnect
                }
            },
            include: { 
                author: {
                    select: {
                        firstName: true,
                        surName: true,
                        pseudo: true
                    }
                },
                likes: {
                    select: {
                        id: true
                    }
                },
                dislikes: {
                    select: {
                        id: true
                    }
                },
                comments: true
            }
        })
        .then(post => res.status(200).json(post))
        .catch(error => handleError(res, 400, error));
    })
    .catch(error => handleError(res, 404, error));
}

function deleteImage(imageUrl) {
    const filename = imageUrl.split(`/${POSTS_IMAGES_SAVE_PATH}/`)[1];
    if (filename === undefined) {
        console.error(new Error("No file found in imageUrl : " + imageUrl));
    } else {
        try {
            fs.unlinkSync(`${POSTS_IMAGES_SAVE_PATH}/${filename}`);
        } catch (error) {
            console.error(error);
        }
    }
}