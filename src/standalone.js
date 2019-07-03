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
	getRoomOffset,
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
	HOST_URL = 'http://localhost:3000',
	MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

setDefaultCredentials({
	username: USERS_USERNAME,
	password: USERS_PASSWORD,
	email: USERS_EMAIL,
});

const urls = HOST_URL.split('|');
const totalUrls = urls.length;

async function main () {
	await redisInit();

	const howMany = parseInt(HOW_MANY);

	console.log('connecting clients:', howMany);

	const go = [];
	for (let i = 0; i < howMany; i++) {
		go.push(connect(urls[i % totalUrls], CLIENT_TYPE));
	}
	await Promise.all(go).then(c => clients.push(...c));

	console.log('logging in clients:', HOW_MANY);

	await doLogin(await getLoginOffset(howMany), Math.min(howMany, parseInt(LOGIN_BATCH)), CLIENT_TYPE);

	if (JOIN_ROOM) {
		console.log('joining room:', JOIN_ROOM);

		let i = 0;
		while (i < howMany) {
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

		const roomOffset = getRoomOffset();

		let i = 0;
		while (i < total) {
			const rid = getRoomId(ROOM_ID, roomOffset++);

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
