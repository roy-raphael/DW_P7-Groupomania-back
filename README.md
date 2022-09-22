# DW_P7-Groupomania-back
Repository for the project 7 back-end of the OpenClassrooms Web Developer Path

## Prerequisites

### RSA keys
A public and a private RSA key files (any location) are needed for the backend to run
(recommanded location if you want to use docker-compose : folder ../../sec_files from here)
* To generate a private RSA key (private.key for exemple) :
`ssh-keygen -t rsa -b 4096 -m PEM -f private.key`
* To generate a public RSA key to the right format (public.key.pub for exemple) :
`openssl rsa -in private.key -pubout -outform PEM -out public.key.pub`

### Certificate (for a HTTPS backend)

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

### For a local run : mysql database & dotenv file

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
* SEC_CERTIFICATE_FILE : path to the certificate file
* SEC_CERTIFICATE_PRIVATE_KEY : path to the private key file relative to the certificate
* JWT_ISSUER : software organization that issues the JWT
* JWT_AUDIENCE : basically identity of the intended recipient of the JWT

### For a docker container run : docker (and docker-compose)

#### docker dotenv file
* Update the 'SEC_RSA_PRIVATE_KEY' and 'SEC_RSA_PUBLIC_KEY' values in the .env.docker file if needed (only their name)
* Update the 'CERTIFICATE_FILE' and 'CERTIFICATE_RSA_PRIVATE_KEY' values in the .env.docker file if needed (only their name)
* If you modified the .env.docker file, regenerate the docker image of the API : `npm run docker:build`

#### docker image
If you have no docker image 'groupomania_back' (check with `docker images`), run `npm run docker:build`

#### docker-compose file
If the RSA keys (public and private) and the certificate (and its private key) are not in the folder `../../sec_files`,
update the volume in the api service of the docker-compose.yml file with your folder containing the RSA keys (<your-folder-relative-path>:/app/sec_files)

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