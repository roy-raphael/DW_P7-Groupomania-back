import * as http from 'http';
import * as https from 'https';
import fs from 'fs';
import app from './app.js';
import process from './utils/load-env.js';
import IS_HTTPS_MODE from './utils/check-if-https.js'

const normalizePort = val => {
    const port = parseInt(val, 10);
  
    if (isNaN(port)) {
      return val;
    }
    if (port >= 0) {
      return port;
    }
    return false;
};
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const errorHandler = error => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
    switch (error.code) {
        case 'EACCES':
        console.error(bind + ' requires elevated privileges.');
        process.exit(1);
        break;
        case 'EADDRINUSE':
        console.error(bind + ' is already in use.');
        process.exit(1);
        break;
        default:
        throw error;
    }
};

var server;
if (IS_HTTPS_MODE) {
    console.log("Launching server with HTTPS mode (secure)");
    var key;
    var cert;
    try {
        // use 'utf8' to get string instead of byte array
        key = fs.readFileSync(process.env.SEC_CERTIFICATE_PRIVATE_KEY, 'utf8');
        cert = fs.readFileSync(process.env.SEC_CERTIFICATE_FILE, 'utf8');
    } catch(error) {
        console.error(error);
        process.kill(process.pid, 'SIGTERM');
    }
    const options = { key, cert };
    
    server = https.createServer(options, app);
} else {
    console.log("Launching server with HTTP mode (unsecure)");
    server = http.createServer(app);
}

server.on('error', errorHandler);
server.on('listening', () => {
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
    console.log('Listening on ' + bind);
});

server.listen(port);