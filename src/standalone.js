import {
	clients,
	openRoom,
	joinRoom,
	doLogin,
	sendRandomMessage,
	connect
} from './lib/api';

const {
	HOW_MANY = 1,
	LOGIN_BATCH = 10,
	LOGIN_OFFSET = 0,
	ROOM_ID = 'GENERAL',
	JOIN_ROOM
} = process.env;

async function main () {

	try {

		console.log('connecting clients:', HOW_MANY);
		const go = [];
		for (let i = 0; i < parseInt(HOW_MANY); i++) {
			go.push(connect());
		}
		await Promise.all(go).then(c => clients.push(...c));

		console.log('logging in clients:', HOW_MANY);

		await doLogin(parseInt(LOGIN_OFFSET), Math.min(parseInt(HOW_MANY), parseInt(LOGIN_BATCH)));

		console.log('opening room:', ROOM_ID);

		const total = clients.length;

		let i = 0;
		while (i < total) {
			if (!clients[i].loggedInInternal) {
				i++;
				continue;
			}
			await openRoom(clients[i], ROOM_ID);
			i++;
		}

		console.log('sending messages to:', ROOM_ID);

		sendRandomMessage({ rid: ROOM_ID });
	} catch (e) {
		console.error('meh', e);
	}
};
main();
