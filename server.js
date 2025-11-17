require('dotenv').config();

const http = require('http');
const app = require('./app');

const port = process.env.PORT || 4010;
const server = http.createServer(app);
server.listen(port, '0.0.0.0');

console.log('0.0.0.0' + ':' + port);


console.log('server.js starting...');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});