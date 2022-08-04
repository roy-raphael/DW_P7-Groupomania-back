

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
 */
// OUT: Array of posts
export function getAllPosts(req, res, next) {
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
 *      example:
 *        text: This is a post text
 *        authorId: e5268c386c9b17c39bd6a17d
 *    multipart/form-data:
 *      schema:
 *        type: object
 *        properties:
 *          post:
 *            $ref: "#/components/schemas/post-form"
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
 *          type: string
 *          description: Post creation message
 *        example: Post created
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
 */
// IN : EITHER Post as JSON OR { post: String, image: File }
// OUT: { message: String }
export function createPost(req, res, next) {
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
 */
// OUT: Single post
export function getOnePost(req, res, next) {
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
 *      example:
 *        text: This is an updated post text
 *        authorId: e5268c386c9b17c39bd6a17d
 *    multipart/form-data:
 *      schema:
 *        type: "object"
 *        properties:
 *          post:
 *            $ref: "#/components/schemas/post-form"
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
 *          type: string
 *          description: Post modification message
 *        example: Post updated
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
 */
// IN : EITHER Post as JSON OR { post: String, image: File }
// OUT: { message: String }
export function modifyPost(req, res, next) {
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
 */
// OUT: { message: String }
export function deletePost(req, res, next) {
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
 *          type: string
 *          description: Comment creation message
 *        example: Comment created
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
 */
// IN : { userId: String, like: Number }
// OUT: { message: String }
export function commentPost(req, res, next) {
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
 *          type: string
 *          description: Post like status update message
 *        example: Post like status updated
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
 */
// IN : { userId: String, like: Number }
// OUT: { message: String }
export function likePost(req, res, next) {
}