import RocketChatClient from '@rocket.chat/sdk/clients/Rocketchat';
import fetch from 'node-fetch';
import { connected } from './lib/prom';

import { sendMessage } from './lib/api';

global.fetch = fetch;

const clients = [];

async function main () {

	const client = new RocketChatClient({
		logger: console,
		host: 'https://bench.rocket.chat',
		useSsl: true
	});

	// await client.connect();
	connected.inc();

	// clients.push(client);

	await client.login({
		username: 'loadtest0',
		password: 'pass0'
	});

	await sendMessage(client, 'GENERAL', 'HELLO');


};
main();
