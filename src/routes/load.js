import koaRouter from 'koa-router';
import RocketChatClient from '@rocket.chat/sdk/clients/Rocketchat';
import fetch from 'node-fetch';

import * as prom from '../lib/prom';

import { login, register, sendMessage } from '../lib/api';

global.fetch = fetch;

const router = koaRouter();
router.prefix('/load');

const logger = {
  debug: (...args) => {},
  info: (...args) => {},
  warning: (...args) => {},
  warn: (...args) => {},
  error: (...args) => { console.error(args)},
};

const clients = [];

router.post('/connect', async (ctx/*, next*/) => {
	const {
		howMany = 1
	} = ctx.request.body;

	for (let i = 0; i < howMany; i++) {
		const client = new RocketChatClient({
			logger,
			host: process.env.HOST_URL || 'http://localhost:3000',
			useSsl: true,
		});

		prom.connected.inc();

		clients.push(client);
	}

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

const loginOrRegister = async (client, credentials) => {
	try {
		await login(client, credentials);
	} catch (e) {
		try {
			await register(client, credentials);

			await login(client, credentials);
		} catch (e) {
			console.error('could not login/register for', credentials);
		}
	}
}

// const doLogin = async (countInit, batchSize = 1) => {
// 	const total = clients.length;

// 	const batch = [];

// 	console.log('total ->', total);

// 	let i = 0;
// 	while (i < total) {
// 		console.log('i ->', i);
// 		if (i % batchSize === 0) {
// 			console.log('fazend', batch.length, total);
// 			await Promise.all(batch);
// 			console.log('ok, limpa')
// 			batch.length = 0;
// 		}
// 		if (clients[i].loggedInInternal) {
// 			i++;
// 			console.log('JA FOI????????????');
// 			continue;
// 		}

// 		const userCount = countInit + i;

// 		const credentials = {
// 			username: `loadtest${ userCount }`,
// 			password: `pass${ userCount }`
// 		};

// 		batch.push(loginOrRegister(clients[i], credentials));
// 		i++;
// 	}

// 	console.log('restou', batch.length);

// 	await Promise.all(batch);
// }

const doLoginBatch = async (current, total, step = 10) => {
	let currentClient = 0;
	while (current < total) {
		const batch = [];
		for (let i = 0; i < step; i++, current++) {
			// const userCount = current;
			const credentials = {
				username: `loadtest${ current }`,
				password: `pass${ current }`
			};
			batch.push(loginOrRegister(clients[currentClient++], credentials))
		}
		await Promise.all(batch)
	}
	console.log(currentClient, 'logged in');
}

const doLogin = async (countInit, batchSize = 1) => {
	const total = clients.length;
	if (batchSize > 1) {
		return await doLoginBatch(countInit, countInit + total, batchSize);
	}

	let i = 0;
	while (i < total) {
		if (clients[i].loggedInInternal) {
			i++;
			continue;
		}

		console.log('login', i);

		const userCount = countInit + i;

		const credentials = {
			username: `loadtest${ userCount }`,
			password: `pass${ userCount }`
		};

		await loginOrRegister(clients[i], credentials);
		i++;
	}
}

router.post('/login', async (ctx/*, next*/) => {
	const countInit = parseInt(process.env.LOGIN_OFFSET) || 0;

	const { batchSize = 10 } = ctx.params;
	doLogin(countInit, batchSize);

	ctx.body = { success: true };
});

router.post('/subscribe/:rid', async (ctx/*, next*/) => {
	const total = clients.length;

	const { rid } = ctx.params;

	let i = 0;
	while (i < total) {
		if (!clients[i].loggedInInternal) {
			i++;
			continue;
		}
		await clients[i].subscribeRoom(rid);
		i++;
	}

	ctx.body = { success: true };
});

let msgInterval;
router.post('/message/send', async (ctx/*, next*/) => {
	const {
		period = 'relative',
		time = 1,
		totalClients
	} = ctx.params;

	const total = totalClients || clients.length;
	const msgPerSecond = 0.002857142857143;
	const timeInterval = period !== 'custom' ? (1 / msgPerSecond/ total) : time;

	if (msgInterval) {
		clearInterval(msgInterval);
	}

	const send = async () => {
		let chosenOne = Math.floor(Math.random() * total);

		while (!clients[chosenOne].loggedInInternal) {
			chosenOne = Math.floor(Math.random() * total);
		}

		try {
			sendMessage(clients[chosenOne], 'GENERAL', `hello from ${ chosenOne }`);
		} catch (e) {
			console.error('error sending message', e);
		}
	};
	msgInterval = setInterval(send, timeInterval * 1000);

	ctx.body = { success: true };
});

router.delete('/message/send', async (ctx/*, next*/) => {
	clearInterval(msgInterval);
});

export default router;
