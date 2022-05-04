import { MongoClient, Db } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { rand } from './lib/rand';
import { getAdminUser, getClients } from './macros/getClients';
import populate from './populate';

export default (): void => {
	let agents: Client[];

	const b = new (class extends BenchmarkRunner {
		private db: Db;

		private skippedPopulate = false;

		private adminUser: Client | undefined;

		private usernames: string[] = [];

		async init() {
			const client = new MongoClient(config.DATABASE_URL);
			await client.connect();
			this.db = client.db(config.DATABASE_NAME);
		}

		async populate() {
			await this.init();
			// Had to duplicate here the getClients() function, because the users from profile() are not ready at this point
			if (!config.DATABASE_URL) {
				console.log('Skip populate, no DATABASE_URL');
				this.skippedPopulate = true;
				return;
			}

			console.log('Start populate DB');

			try {
				const users = this.db.collection('users');

				console.log('Checking if the hash already exists');

				if (await users.findOne({ _id: new RegExp(config.hash) })) {
					console.log('Task skipped');
					this.skippedPopulate = true;
					return;
				}

				const results = await populate({ roles: ['livechat-agent'] });

				console.log(
					`Inserting users: ${results.users.length} rooms: ${results.rooms.length} subscriptions: ${results.subscriptions.length}`
				);

				const subscriptions = this.db.collection('rocketchat_subscription');
				const rooms = this.db.collection('rocketchat_room');

				await Promise.all([
					subscriptions.insertMany(results.subscriptions),
					rooms.insertMany(results.rooms),
					users.insertMany(results.users),
				]);

				this.usernames = results.users.map((user) => user.username);
				console.log('Done populating DB');
			} catch (e) {
				console.error(e);
			}
		}

		private getCurrentFromUsers(users: string[]): number[] {
			return users.map((username) => username.split('-')[2]).map(Number);
		}

		async setup() {
			agents = await getClients(
				config.HOW_MANY_USERS,
				this.getCurrentFromUsers(this.usernames)
			);

			const settings = this.db.collection('rocketchat_settings');
			await settings.updateOne(
				// @ts-expect-error _id is an ObjectID for mongo, but a string for settings :)
				{ _id: 'Livechat_Routing_Method' },
				{ $set: { value: 'Manual_Selection' } }
			);
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
			await agent.openLivechatRoom(
				processedInquiry.rid,
				processedInquiry.v._id
			);
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
