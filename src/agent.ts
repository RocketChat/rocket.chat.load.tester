import { MongoClient } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { rand } from './lib/rand';
import { getAdminUser, getClients } from './macros/getClients';
import populate from './populate';

export default (): void => {
	let agents: Client[];

	const b = new (class extends BenchmarkRunner {
		private skippedPopulate = false;

		private adminUser: Client | undefined;

		async populate() {
			// Had to duplicate here the getClients() function, because the users from profile() are not ready at this point
			if (!config.DATABASE_URL) {
				console.log('Skip populate, no DATABASE_URL');
				this.skippedPopulate = true;
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
					console.log('Task skipped');
					this.skippedPopulate = true;
					return;
				}

				const results = await populate();

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
			const clients = await getClients(config.HOW_MANY_USERS);
			agents = clients.filter((_v, i) => i % 2 === 0);

			const admin = await getAdminUser();
			this.adminUser = admin;

			for await (const client of agents) {
				await admin.promoteUserToAgent(client.username);
			}
		}
	})({
		getRoutingConfig: config.ROUTING_CONFIG_PER_SEC,
		getQueuedInquiries: config.QUEUED_INQUIRIES_PER_SEC,
		sendMessageLivechat: config.LIVECHAT_MESSAGES_PER_SEC,
	});

	b.on('ready', () => {
		console.log('Started agent processing');
		console.log(
			'algo is determined by the server, by default it should be MANUAL_SELECTION'
		);
	});

	b.on('getRoutingConfig', async () => {
		const agent = rand(agents);
		await agent.getRoutingConfig();
		await agent.getAgentDepartments();
	});

	b.on('getQueuedInquiries', async () => {
		const agent = rand(agents);
		const response = await agent.getQueuedInquiries();
		if (!response?.inquiries) {
			return;
		}

		const { inquiries } = response;
		// if there's inquiries, do the processing
		// Everytime we get the event, we'll take one of the inquiries if any, and
		// do the normal agent operation
		if (!inquiries.length) {
			return;
		}

		const processedInquiry = rand(inquiries);
		try {
			// Re-fetch inquiry
			await agent.getInquiry(processedInquiry._id);
			// open room
			await agent.openLivechatRoom(processedInquiry.rid);
			// fetch info
			await agent.getVisitorInfo(processedInquiry.v._id);
			// take inquiry
			await agent.takeInquiry(processedInquiry._id);
		} catch (e) {
			console.error(e);
		}
	});

	b.on('sendMessageLivechat', async () => {
		const agent = rand(agents);
		const sub = agent.getRandomLivechatSubscription();

		if (!sub) {
			return;
		}

		try {
			await agent.sendMessage('Hello, I am an agent', sub.rid);
		} catch (e) {
			console.error(e);
		}
	});

	b.run();
};
