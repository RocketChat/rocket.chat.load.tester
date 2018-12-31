import * as prom from './prom';

export async function login(client, credentials) {
	await client.login(credentials);
	// await client.connect();
	// await client.socket.then(s => s.login(credentials))

	await Promise.all([
		client.subscribeNotifyAll(),
		client.subscribeLoggedNotify(),
		client.subscribeNotifyUser(),
	]);
};

export function register (client, { username, password }) {
	return client.post('users.register', {
		username,
		email: `${ username }@loadtest.com`,
		pass: password,
		name: username
	});
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
