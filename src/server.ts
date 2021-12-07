import http from 'http';

import debugModule from 'debug';
import Koa from 'koa';
// import onerror from 'koa-better-error-handler';
import bodyparser from 'koa-bodyparser';
import json from 'koa-json';

import metrics from './routes/metrics';

const debug = debugModule('app:server');

const app = new Koa();

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val?: string | number) {
	const port = typeof val === 'string' ? parseInt(val, 10) : val;

	if (port && isNaN(port)) {
		// named pipe
		return val;
	}

	if (port) {
		// port number
		return port;
	}

	return false;
}

const port = normalizePort(process.env.PORT || '3000');
// app.set('port', port);

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	// const addr = this.address();
	// const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
	debug(`Listening on port ${port}`);
}

/**
 * Create HTTP server.
 */
const server = http.createServer(app.callback());

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
// server.on('error', onError);
server.on('listening', onListening);

// // error handler
// onerror(app, {
//   all(error, ctx) {
//     ctx.response.type = 'application/json';
//     ctx.body = JSON.stringify({
//       success: false,
//       error,
//     });
//   },
// });

// middlewares
app.use(
	bodyparser({
		enableTypes: ['json', 'form', 'text'],
	})
);
app.use(json());
// app.use(logger());

// logger
app.use(async (ctx, next) => {
	const start = new Date();
	await next();
	const ms = new Date().getTime() - start.getTime();
	console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// routes
app.use(metrics.routes()); // , metrics.allowedMethods());
// app.use(load.routes(), load.allowedMethods());

// error-handling
app.on('error', (err, ctx) => {
	console.error('server error', err, ctx);
});

export default app;
