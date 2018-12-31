import koaRouter from 'koa-router';
import client from '../lib/prom';

const router = koaRouter();

router.get('/metrics', async (ctx/*, next*/) => {
	// res.setHeader('Content-Type', 'text/plain');

	ctx.body = client.register.metrics();
});

export default router;
