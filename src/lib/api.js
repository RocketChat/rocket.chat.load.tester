import * as prom from './prom';

export async function login(client, credentials) {
	const end = prom.login.startTimer();

	await client.login(credentials);
	// await client.connect();
	// await client.socket.then(s => s.login(credentials))

	// do one by one as doing three at same time was hanging
	await client.subscribeNotifyAll();
	await client.subscribeLoggedNotify();
	await client.subscribeNotifyUser();

	// await Promise.all([
	// 	client.subscribeNotifyAll(),
	// 	client.subscribeLoggedNotify(),
	// 	client.subscribeNotifyUser(),
	// ]);

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
