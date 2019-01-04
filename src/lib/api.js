import RocketChatClient from '@rocket.chat/sdk/clients/Rocketchat';
import fetch from 'node-fetch';

import * as prom from './prom';

global.fetch = fetch;

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

	await client.login(credentials);

	// do one by one as doing three at same time was hanging
	await client.subscribeLoggedNotify();
	await client.subscribeNotifyUser();
	await client.subscribeUserData();

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

	end();
};

export async function register(client, { username, password }) {
	const end = prom.register.startTimer();
	await client.post('users.register', {
		username,
		email: `${ username }@loadtest.com`,
		pass: password,
		name: username
	});
	end();
}

export async function typing(client, rid, typing) {
	return client.socket.then((socket) => socket.ddp.call('stream-notify-room', `${ rid }/typing`, client.username, typing));
}

export async function sendMessage(client, rid, msg) {
	await typing(client, rid, true);

	const end = prom.messages.startTimer();
	await client.sendMessage(msg, rid);
	end();

	await typing(client, rid, false);
}

export async function subscribeRoom(client, rid) {
	const end = prom.roomSubscribe.startTimer();
	await client.subscribeRoom(rid);
	end();
}

export async function joinRoom(client, rid) {
	const end = prom.roomJoin.startTimer();
	await client.joinRoom({ rid });
	end();
}

export async function openRoom(client, rid) {
	const socket = await client.socket;

	await Promise.all([
		subscribeRoom(client, rid),
		socket.ddp.call('getRoomRoles', rid),
		socket.ddp.call('loadHistory', rid, null, 50, new Date())
	]);

	await socket.ddp.call('readMessages', rid);
}
