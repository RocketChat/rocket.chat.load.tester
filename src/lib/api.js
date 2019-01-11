import RocketChatClient from '@rocket.chat/sdk/clients/Rocketchat';
import fetch from 'node-fetch';

import * as prom from './prom';

global.fetch = fetch;

export const clients = [];

const logger = false || {
	debug: (...args) => {},
	info: (...args) => {},
	warning: (...args) => {},
	warn: (...args) => {},
	error: (...args) => { console.error(args)},
};

export async function connect() {
	const client = new RocketChatClient({
		logger,
		host: process.env.HOST_URL || 'http://localhost:3000',
		useSsl: true,
	});
	await client.connect();

	prom.connected.inc();

	const socket = await client.socket;

	await new Promise(async (resolve) => {
		await socket.ddp.call('public-settings/get');
		await socket.ddp.call('permissions/get');

		// this is done to simulate web client
		await client.subscribe('meteor.loginServiceConfiguration');
		await client.subscribe('meteor_autoupdate_clientVersions');

		await client.subscribeNotifyAll();

		resolve();
	});

	return client;
}

export async function login(client, credentials) {
	const end = prom.login.startTimer();
	try {
		await client.login(credentials);

		// do one by one as doing three at same time was hanging
		await client.subscribeLoggedNotify();
		await client.subscribeNotifyUser();
		await client.subscribeUserData();

		// await Promise.all([
		// 	'roles',
		// 	'webdavAccounts',
		// 	'userData',
		// 	// 'activeUsers'
		// ].map(stream => client.subscribe(stream, '')));

		const socket = await client.socket;

		await Promise.all([
			'listCustomSounds',
			'listEmojiCustom',
			'getUserRoles',
			'subscriptions/get',
			'rooms/get',
			'apps/is-enabled'
		].map(name => socket.ddp.call(name)));

		client.loggedInInternal = true;

		end({ status: 'success' });
	} catch (e) {
		console.error('error joining room', e);
		end({ status: 'error' });
		throw e;
	}
};

export async function register(client, { username, password }) {
	const end = prom.register.startTimer();
	try {
		await client.post('users.register', {
			username,
			email: `${ username }@loadtest.com`,
			pass: password,
			name: username
		});
		end({ status: 'success' });
	} catch (e) {
		console.error('error register', e);
		end({ status: 'error' });
	}
}

export async function typing(client, rid, typing) {
	return client.socket.then((socket) => socket.ddp.call('stream-notify-room', `${ rid }/typing`, client.username, typing));
}

export async function sendMessage(client, rid, msg) {
	await typing(client, rid, true);

	const end = prom.messages.startTimer();
	try {
		await client.sendMessage(msg, rid);
		end({ status: 'success' });
	} catch (e) {
		console.error('error sending message', e);
		end({ status: 'error' });
	}

	await typing(client, rid, false);
}

export async function subscribeRoom(client, rid) {
	const end = prom.roomSubscribe.startTimer();
	try {
		await client.subscribeRoom(rid);
		end({ status: 'success' });
	} catch (e) {
		console.error('error subscribing room', e);
		end({ status: 'error' });
	}
}

export async function joinRoom(client, rid) {
	const end = prom.roomJoin.startTimer();
	try {
		await client.joinRoom({ rid });
		end({ status: 'success' });
	} catch (e) {
		console.error('error joining room', e);
		end({ status: 'error' });
	}
}

export async function openRoom(client, rid) {
	const end = prom.openRoom.startTimer();
	try {
		const socket = await client.socket;

		await Promise.all([
			subscribeRoom(client, rid),
			socket.ddp.call('getRoomRoles', rid),
			socket.ddp.call('loadHistory', rid, null, 50, new Date())
		]);

		await socket.ddp.call('readMessages', rid);
		end({ status: 'success' });
	} catch (e) {
		console.error('error open room', e);
		end({ status: 'error' });
	}
}

export const loginOrRegister = async (client, credentials) => {
	try {
		await login(client, credentials);
	} catch (e) {
		console.log('error', e);
		try {
			await register(client, credentials);

			await login(client, credentials);
		} catch (e) {
			console.error('could not login/register for', credentials);
		}
	}
}

export const doLoginBatch = async (current, total, step = 10) => {
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

export const doLogin = async (countInit, batchSize = 1) => {
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

		// console.log('login', i);

		const userCount = countInit + i;

		const credentials = {
			username: `loadtest${ userCount }`,
			password: `pass${ userCount }`
		};

		await loginOrRegister(clients[i], credentials);
		i++;
	}
}

export let msgInterval;
export function sendRandomMessage({ rid, totalClients, period, time }) {
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
			sendMessage(clients[chosenOne], rid, `hello from ${ chosenOne }`);
		} catch (e) {
			console.error('error sending message', e);
		}
	};
	msgInterval = setInterval(send, timeInterval * 1000);
}
