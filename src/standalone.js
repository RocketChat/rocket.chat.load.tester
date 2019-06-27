import {
	clients,
	openRoom,
	joinRoom,
	doLogin,
	sendRandomMessage,
	connect,
	setDefaultCredentials,
} from './lib/api';

import {
	getLoginOffset,
	getRoomId,
} from './lib/utils';

import {
	redisInit,
} from './lib/redis';

import {
	events,
	EVENT_RATE_CHANGE,
} from './lib/events';

const {
	HOW_MANY = 1,
	LOGIN_BATCH = 10,
	OPEN_ROOM = 'true',
	ROOM_ID = 'GENERAL',
	JOIN_ROOM,
	SEND_MESSAGES = 'yes',
	CLIENT_TYPE = 'web',
	USERS_USERNAME,
	USERS_PASSWORD,
	USERS_EMAIL,
	MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

setDefaultCredentials({
	username: USERS_USERNAME,
	password: USERS_PASSWORD,
	email: USERS_EMAIL,
});

async function main () {
	await redisInit();

	console.log('connecting clients:', HOW_MANY);

	const go = [];
	for (let i = 0; i < parseInt(HOW_MANY); i++) {
		go.push(connect(CLIENT_TYPE));
	}
	await Promise.all(go).then(c => clients.push(...c));

	console.log('logging in clients:', HOW_MANY);

	await doLogin(await getLoginOffset(parseInt(HOW_MANY)), Math.min(parseInt(HOW_MANY), parseInt(LOGIN_BATCH)), CLIENT_TYPE);

	if (JOIN_ROOM) {
		console.log('joining room:', JOIN_ROOM);

		let i = 0;
		while (i < parseInt(HOW_MANY)) {
			if (!clients[i].loggedInInternal) {
				i++;
				continue;
			}
			await joinRoom(clients[i], JOIN_ROOM);
			i++;
		}
	}

	if (['yes', 'true'].includes(OPEN_ROOM)) {
		console.log('opening rooms');

		const total = clients.length;

		let i = 0;
		while (i < total) {
			const rid = await getRoomId(ROOM_ID);

			if (!clients[i].loggedInInternal) {
				i++;
				continue;
			}
			await openRoom(clients[i], rid, CLIENT_TYPE);
			clients[i].roomIdInternal = rid;
			i++;
		}

		if (['yes', 'true'].includes(SEND_MESSAGES)) {
			console.log('sending messages');

			sendRandomMessage({
				msgPerSecond: parseFloat(MESSAGE_SENDING_RATE),
			});

			events.on(EVENT_RATE_CHANGE, (msgPerSecond) => sendRandomMessage({ msgPerSecond }));
		}
	}
	console.log('done!');
};
main();
