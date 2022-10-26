# DW_P7-Groupomania-back
Repository for the project 7 back-end of the OpenClassrooms Web Developer Path

## Summary
There are 2 environment possibilities for running the backend :
* A local run, directly on the host machine : MySQL and NodeJS have to be installed
* A docker run with docker-compose : docker and docker-compose have to be installed

There are 2 possible launching mode for the API :
* HTTPS : more secure ; default mode
* HTTP : unsecure ; some changes have to be made if you want to launch this mode with docker.

## Prerequisites

### Prerequisites : RSA keys
A public and a private RSA key files (any location) are needed for the backend to run
(recommanded location if you want to use docker-compose : folder ../../sec_files from here)
* To generate a private RSA key (private.key for exemple) :
`ssh-keygen -t rsa -b 4096 -m PEM -f private.key`
* To generate a public RSA key to the right format (public.key.pub for exemple) :
`openssl rsa -in private.key -pubout -outform PEM -out public.key.pub`

### [HTTPS mode only] Prerequisites : Certificate

#### Generate a self-signed certificate and its private key
* Create (or place you in) a folder that will contain the certificate and the private key
(recommanded location if you want to use docker-compose : folder ../../sec_files from here)
* In this folder, create a 'cert_conf.cnf' file, with the fillowing content :
```
[req]
default_bits = 2048
encrypt_key = no
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = FR
ST = France
L = Paris
O = Company
OU = Division
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
```
* In this folder, execute the following command :
`openssl req -x509 -newkey rsa:4096 -keyout back_certificate.key -nodes -out back_certificate.crt -sha256 -days 365 -config cert_conf.cnf`

#### Install the certificate on the host machine
* On Windows :
    * Double-click on the certificate file (back_certificate.crt)
    * Click on "Install Certificate..."
    * Select "Current user" and click on "Next"
    * Select "Place all certificates in the following store" and click on "Browse"
    * Select "Trusted Root Certification Authorities" and click on "OK"
    * Click on "Next"
    * Click on "Finish"
    * On the next pop-up, click on "OK"

#### If you want to use Firefox : enable the enterprise roots for security
* In a new Firefox tab, type or paste `about:config` in the address bar and press Enter/Return. Click the button accepting the risk.
* In the search box in the page, type or paste `security.enterprise_roots.enabled` and pause while the list is filtered
* If the preference has a value of `false`, double-click it to set the value of `true`

### [local run only] Prerequisites

#### MySQL database
A MySQL database where the backend can connect to.
You should have the following informations from the database for a use in the backend :
* name of the database to connect to
* username to use
* password to use

#### dotenv file
A ".env" file is required in the backend folder, with the following variables :
* DATABASE_URL : URL of the database -> 'mysql://<user>:<password>@localhost:3306/<database_name>'
* SEC_RSA_PRIVATE_KEY : path to the private RSA key file
* SEC_RSA_PUBLIC_KEY : path to the public RSA key file (PEM format)
* SEC_CERTIFICATE_FILE : path to the certificate file [required only for HTTPS mode]
* SEC_CERTIFICATE_PRIVATE_KEY : path to the private key file relative to the certificate [required only for HTTPS mode]
* JWT_ISSUER : software organization that issues the JWT
* JWT_AUDIENCE : basically identity of the intended recipient of the JWT

### [docker run only] Prerequisites

#### [HTTP mode only] Dockerfile
* Update the last line of the Dockerfile : replace `start:migrate` with `start:migrate:unsecure`

#### docker dotenv file
* Update the 'SEC_RSA_PRIVATE_KEY' and 'SEC_RSA_PUBLIC_KEY' values in the .env.docker file if needed (only their name)
* Update the 'CERTIFICATE_FILE' and 'CERTIFICATE_RSA_PRIVATE_KEY' values in the .env.docker file if needed (only their name) [required only for HTTPS mode]
* If you modified the .env.docker file, regenerate the docker image of the API : `npm run docker:build`

#### docker image
Generate a new docker image for the backend (run `npm run docker:build`) if :
* you have no docker image 'groupomania_back' (check with `docker images`)
* the code has changed since the last docker image 'groupomania_back' generation
* you modified the Dockerfile since the last docker image 'groupomania_back' generation
* you modified the docker dotenv file since the last docker image 'groupomania_back' generation

#### docker-compose file
If the RSA keys (public and private) and the certificate (and its private key) are not in the folder `../../sec_files`,
update the volume in the api service of the docker-compose.yml file with your folder containing the RSA keys (<your-folder-relative-path>:/app/sec_files)

## [local run only] Install
Run `npm install` (in the backend folder)

## [local run only] Deploy database schemas
Run `npm run prisma:deploy` (in the backend folder)

## Run

### [local run only] Run
Run the server with the following command (in the backend folder) :
* [HTTPS mode only] `npm start`
* [HTTP mode only] `npm run start:unsecure`

### [docker run only] Run
Run `docker-compose up` (in the backend folder)

## Restore the database from a SQL dump file (and an images folder)

### Restore the images of the posts

Copy all of the images inside an 'images' folder (to create if absent) in the backend repo folder (aside this README.md file)

### [local run only] Restore database
Run `mysql -u <username> -p -e "CREATE DATABASE IF NOT EXISTS <database_name>; use <database_name>; source <groupomania_database_dump.sql>;"`, where :
 * <groupomania_database_dump.sql> is the path to the SQL dump file to restore
 * <database_name> is the name of the database to connect to
 * <username> is the user you use for your MySQL instance

then, enter the password you use for this user

### [docker run only] Restore database
 * Run `docker ps` to identify the the ID of the backend MySQL database container : <db_container_id>
 * Run `docker cp <groupomania_database_dump.sql> <db_container_id>:/dump.sql`, where <groupomania_database_dump.sql> is the path to the SQL dump file to restore
 * Run `docker exec -ti <db_container_id> mysql -u groupomania -p'j!ET@*XC63bncf' -e "CREATE DATABASE IF NOT EXISTS groupomania_main; use groupomania_main; source dump.sql;"`

## Generate OpenAPI documentation
Run `npm run doc` (in the backend folder)

## View OpenAPI documentation
The OpenAPI documentation is in the file groupomania-openapi-doc.json
To visualize the OpenAPI documentation, you can use a VSCode pluggin (Swagger Viewer for example),
or paste the content of groupomania-openapi-doc.json in the editor on the following website : https://editor-next.swagger.io/