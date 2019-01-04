import {
	login,
	register,
	sendMessage ,
	openRoom,
	joinRoom,
	connect
} from './lib/api';

// const clients = [];

async function main () {

	try {
		const client = await connect();

		await login(client, {
			username: 'loadtest0',
			password: 'pass0'
		});

		await openRoom(client, 'GENERAL');

		await sendMessage(client, 'GENERAL', 'HELLO');
	} catch (e) {
		console.error('meh', e);
	}
};
main();
