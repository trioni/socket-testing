'use strict';
const express = require('express');
const consolidate = require('consolidate');
const logger = require('bunyan').createLogger({name: 'www'});
const appRoot = require('app-root-path');
const bodyParser = require('body-parser');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
// const emitter = require('socket.io-emitter')({ host: '127.0.0.1', port: 6379 });

const PORT = process.env.PORT || 3000;

// Setup template rendering
// Enable Pug
// set views path, template engine and default layout
app.engine('pug', consolidate.pug);
app.set('view engine', 'pug');
app.set('views', [appRoot + '/server/templates/']);

// Parse POST body
// decode urlencoded stuff
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));

// parse application/json
app.use(bodyParser.json({limit: '5mb'}));

// parse text https://github.com/expressjs/body-parser#bodyparsertextoptions
app.use(bodyParser.text({limit: '5mb'}));

server.listen(PORT);

app.get('/', (req, res) => {
    res.render('index', {
        jumboTitle: 'Socket playground'
    });
});

let connections = [];
app.post('/io/:ns/send', (req, res) => {
	const ns = req.params.ns;
	const body = req.body;
	const targetSocket = connections.find(socket => {
		return socket.id === ns;
	});
	if (targetSocket) {
		targetSocket.emit('webhook', body);
		return res.json('ok');
	}

	return res.json('Namespace not allowed');
});

io.sockets.on('connection', function (socket) {
	connections.push(socket);
	logger.info('[Connected Sockets]', connections.length, connections.map(socket => socket.id));
	socket.broadcast.to(socket.id).emit('connected2', { value: `Welcome to sockets: ${socket.id}`});
	socket.emit('connected', { value: `Welcome: ${socket.id}` });
	socket.on('connected response', function (data) {
		console.log('[Connected Response]', data);
	});

	socket.on('disconnect', (data) => {
		connections.splice(connections.indexOf(socket), 1);
		logger.info('[Disconnected]', connections.length);
	})
});

logger.info(`[Server started at port: ${PORT}]`);
