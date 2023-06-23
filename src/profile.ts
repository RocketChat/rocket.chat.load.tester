import { MongoClient } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { userId } from './lib/ids';
import { getRandomInt, rand } from './lib/rand';
import { getClients } from './macros/getClients';
// import { joinRooms } from './macros/joinRooms';
import { populateDatabase, isFullPopulation } from './populate';

export default (): void => {
	let clients: Client[];

	const b = new (class extends BenchmarkRunner {
		async populate() {
			if (!config.DATABASE_URL) {
				console.log('Skip populate, no DATABASE_URL');
				return;
			}

			console.log('Start populate DB');

			const client = new MongoClient(config.DATABASE_URL);

			try {
				await client.connect();
				const db = client.db(config.DATABASE_NAME);

				const users = db.collection('users');

				console.log('Checking if the hash already exists');

				if (await users.findOne({ _id: new RegExp(config.hash) })) {
					console.log(
						'Hash for current task already found, skipping DB populate'
					);
					return;
				}

				const results = await populateDatabase();

				if (!isFullPopulation(results)) {
					return;
				}

				console.log(
					`Inserting users: ${results.users.length} rooms: ${results.rooms.length} subscriptions: ${results.subscriptions.length}`
				);

				const subscriptions = db.collection('rocketchat_subscription');
				const rooms = db.collection('rocketchat_room');

				await Promise.all([
					subscriptions.insertMany(results.subscriptions),
					rooms.insertMany(results.rooms),
					users.insertMany(results.users),
				]);

				console.log('Done populating DB');
			} finally {
				await client.close();
			}
		}

		async setup() {
			clients = await getClients(config.HOW_MANY_USERS);

			// if (config.JOIN_ROOM) {
			// await joinRooms(clients);
			// }
		}
	})({
		message: config.MESSAGES_PER_SECOND,
		readMessages: config.READ_MESSAGE_PER_SECOND,
		openRoom: config.OPEN_ROOM_PER_SECOND,
		setUserStatus: config.SET_STATUS_PER_SECOND,
		subscribePresence: config.SUBSCRIBE_PRESENCE_PER_SECOND,
	});

	b.on('ready', async () => {
		console.log('Starting sending messages');
	});

	b.on('message', async () => {
		const client = rand(clients);
		if (!client.loggedIn) {
			await client.login();
		}

		const subscription = client.getRandomSubscription();

		if (!subscription) {
			return;
		}
		try {
			await client.sendMessage(config.MESSAGE, subscription.rid);
		} catch (error) {
			console.error('Error sending message', error);
		}
	});

	b.on('setUserStatus', async () => {
		const client = rand(clients);
		if (!client.loggedIn) {
			await client.login();
		}

		await client.setStatus();
	});

	b.on('readMessages', async () => {
		const client = rand(clients);
		if (!client.loggedIn) {
			await client.login();
		}
		const subscription = client.getRandomSubscription();
		if (!subscription) {
			return;
		}

		await client.read(subscription.rid);
	});

	b.on('openRoom', async () => {
		const client = rand(clients);
		if (!client.loggedIn) {
			await client.login();
		}

		const subscription = client.getRandomSubscription();
		if (!subscription) {
			return;
		}
		await client.openRoom(subscription.rid);
	});

	b.on('subscribePresence', async () => {
		const client = rand(clients);
		if (!client.loggedIn) {
			await client.login();
		}

		// change half the subscriptions to presence
		const newSubs = Math.min(Math.round(client.getManyPresences() / 2), 1);

		const newIds = [];

		for (let i = 0; i < newSubs; i++) {
			newIds.push(userId(getRandomInt(config.HOW_MANY_USERS)));
		}

		const userIds = client.usersPresence.slice(newSubs);

		userIds.push(...newIds);

		await client.listenPresence(userIds);
	});

	b.run()
		.catch((e) => {
			console.error('Error during run', e);
		});
};
