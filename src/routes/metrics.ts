import koaRouter from '@koa/router';

import client from '../lib/prom';

const router = koaRouter();

router.get('/metrics', async (ctx: any /* , next*/): Promise<void> => {
	// res.setHeader('Content-Type', 'text/plain');
	ctx.body = await client.register.metrics();
});

export default router;
