import Koa from 'koa';
const app = new Koa();
import json from 'koa-json';
import onerror from 'koa-onerror';
import bodyparser from 'koa-bodyparser';
// import logger from 'koa-pino-logger';

import metrics from './routes/metrics';
import load from './routes/load';

// error handler
onerror(app, {
	all (error, ctx) {
		ctx.response.type = 'application/json';
		ctx.body = JSON.stringify({
			success: false,
			error
		});
	}
});

// middlewares
app.use(bodyparser({
	enableTypes:['json', 'form', 'text']
}));
app.use(json());
// app.use(logger());

// logger
app.use(async (ctx, next) => {
	const start = new Date();
	await next();
	const ms = new Date() - start;
	console.log(`${ ctx.method } ${ ctx.url } - ${ ms }ms`);
});

// routes
app.use(metrics.routes(), metrics.allowedMethods());
app.use(load.routes(), load.allowedMethods());

// error-handling
app.on('error', (err, ctx) => {
	console.error('server error', err, ctx);
});

export default app;
