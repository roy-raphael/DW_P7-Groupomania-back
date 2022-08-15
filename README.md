# DW_P7-Groupomania-back
Repository for the project 7 back-end of the OpenClassrooms Web Developer Path

## Prerequisites

### RSA keys
A public and a private RSA key files (any location) are needed for the backend to run
* To generate a private RSA key (private.key for exemple) :
`ssh-keygen -t rsa -b 4096 -m PEM -f private.key`
* To generate a public RSA key to the right format (public.key.pub for exemple) :
`openssl rsa -in private.key -pubout -outform PEM -out public.key.pub`

### For a local run : mysql database & dotenv file

#### MySQL database
A MySQL database where the backend can connect to.
You should have the following informations from the database for a use in the backend :
* name of the database to connect to
* username to use
* password to use

### dotenv file
A ".env" file is required in the backend folder, with the following variables :
-> 'mysql://<user>:<password>@localhost:3306/<database_name>'
* RSA_PRIVATE_KEY : path to the private RSA key file
* RSA_PUBLIC_KEY : path to the public RSA key file (PEM format)
* JWT_ISSUER : software organization that issues the JWT
* JWT_AUDIENCE : basically identity of the intended recipient of the JWT

### For a docker container run : docker (and docker-compose)
Update the 'RSA_PRIVATE_KEY' and 'RSA_PUBLIC_KEY' values in the .env.docker file if needed (depending on where the RSA key files are)

## Install : only for a local run (not docker)
Run `npm install` (in the backend folder)

## Run

### For a local run
* Run the MySQL database
* Run the server : `npm run start` (in the backend folder)
If you want a server that automatically reload if you change any of the source files,
you can instead run `nodemon server` (after having installing nodemon : `npm install nodemon`)

### For a docker container run
Run `docker-compose up` (in the backend folder)

## Generate OpenAPI documentation
Run `npm run doc` (in the backend folder)

## View OpenAPI documentation
The OpenAPI documentation is here : backend/hot-takes-openapi-doc.json
To visualize the OpenAPI documentation, you can use a VSCode pluggin (Swagger Viewer for example),
or paste the content of hot-takes-openapi-doc.json in the editor on the following website : https://editor.swagger.io/