import {
	clients,
	openRoom,
	joinRoom,
	sendRandomMessage,
	connectAndLogin,
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
	JOIN_ROOM,
	SEND_MESSAGES = 'yes',
	CLIENT_TYPE = 'web',
	USERS_USERNAME = 'tester-%s',
	USERS_PASSWORD = 'tester-%s',
	USERS_EMAIL = 'tester-%s@domain.com',
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

const howMany = parseInt(HOW_MANY);


const joinRooms = async () => {
	if (!JOIN_ROOM) {
		return;
	}
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

const openRooms = async () => {
	if (!['yes', 'true'].includes(OPEN_ROOM)) {
		return;
	}
	console.log('opening rooms');

	const total = clients.length;

	// let roomOffset = await getRoomOffset(howMany);

	let i = 0;
	while (i < total) {
		if (!clients[i].loggedInInternal) {
			i++;
			continue;
		}

		await openRoom(clients[i], getRoomId(clients[i].userCount), CLIENT_TYPE);
		i++;
	}
}

const sendMessages = async () => {
	if (!['yes', 'true'].includes(SEND_MESSAGES)) {
		return;
	}

	console.log('sending messages');

	sendRandomMessage({
		msgPerSecond: parseFloat(MESSAGE_SENDING_RATE),
	});

	events.on(EVENT_RATE_CHANGE, (msgPerSecond) =>
		setTimeout(() => sendRandomMessage({ msgPerSecond }), Math.random() * 5000)
	);
}

async function main () {
	await redisInit();

	console.log('connecting clients:', howMany);

	const offset = await getLoginOffset(howMany);

	const loginBatch = Math.min(howMany, parseInt(LOGIN_BATCH));

	const go = [];
	for (let i = 0; i < howMany; i++) {
		go.push(connectAndLogin(urls[i % totalUrls], CLIENT_TYPE, offset + i));
		if (loginBatch > 0 && loginBatch % i === 1) {
			await Promise.all(go).then(c => clients.push(...c));
			go.length = 0;
		}
	}
	await Promise.all(go).then(c => clients.push(...c));

	await joinRooms();

	await openRooms();

	await sendMessages();

	console.log('done!');
};
main();
