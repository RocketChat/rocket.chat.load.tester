import koaRouter from 'koa-router';

import * as prom from '../lib/prom';

import {
	// login,
	// register,
	sendMessage,
	msgInterval,
	openRoom,
	joinRoom,
	connect,
	clients,
	// loginOrRegister,
	// doLoginBatch,
	doLogin
} from '../lib/api';

const router = koaRouter();
router.prefix('/load');

// const clients = [];

router.post('/connect', async (ctx/*, next*/) => {
	const {
		howMany = 1
	} = ctx.request.body;

	const go = [];

	for (let i = 0; i < howMany; i++) {
		go.push(connect());
	}

	Promise.all(go).then(c => clients.push(...c));

	ctx.body = { success: true };
});

router.post('/disconnect', async (ctx/*, next*/) => {
	const {
		howMany = 1
	} = ctx.request.body;

	const total = clients.length;

	let i = 0;
	while (i < howMany && i < total) {
		const client = clients.shift();
		await client.disconnect();

		prom.connected.dec();
		i++;
	}

	ctx.body = { success: true };
});

router.post('/login', async (ctx/*, next*/) => {
	const {
		offset = 0,
		batchSize = 10,
	} = ctx.request.body;

	const countInit = parseInt(offset) || 0;

	doLogin(countInit, batchSize);

	ctx.body = { success: true };
});

router.post('/open-room/:rid', async (ctx/*, next*/) => {
	const total = clients.length;

	const { rid } = ctx.params;

	let i = 0;
	while (i < total) {
		if (!clients[i].loggedInInternal) {
			i++;
			continue;
		}
		openRoom(clients[i], rid);
		i++;
	}

	ctx.body = { success: true };
});

router.post('/message/send/:rid', async (ctx/*, next*/) => {
	const {
		rid,
	} = ctx.params;

	const {
		period = 'relative',
		time = 1,
		totalClients
	} = ctx.request.body;

	sendRandomMessage({ rid, totalClients, period, time });

	ctx.body = { success: true };
});

router.delete('/message/send', async (ctx/*, next*/) => {
	clearInterval(msgInterval);
});

router.post('/join/:rid', async (ctx/*, next*/) => {
	const total = clients.length;

	const { rid } = ctx.params;

	let i = 0;
	while (i < total) {
		if (!clients[i].loggedInInternal) {
			i++;
			continue;
		}
		joinRoom(clients[i], rid);
		i++;
	}

	ctx.body = { success: true };
});

export default router;
