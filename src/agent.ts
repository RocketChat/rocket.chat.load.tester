import { MongoClient, Db } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { rand } from './lib/rand';
import { getClients } from './macros/getClients';
import { populateDatabase, isOnlyUserPopulation } from './populate';

export default (): void => {
	let agents: Client[];

	const b = new (class extends BenchmarkRunner {
		private db: Db | undefined;

		private client: MongoClient | undefined;

		private skippedPopulate = false;

		private adminUser: Client | undefined;

		private usernames: string[] = [];

		private extraPrefix = '-agent-';

		async init() {
			this.client = new MongoClient(config.DATABASE_URL);
			await this.client.connect();
			this.db = this.client.db(config.DATABASE_NAME);
		}

		async populate() {
			await this.init();
			// Had to duplicate here the getClients() function, because the users from profile() are not ready at this point
			if (!config.DATABASE_URL) {
				console.log('Skip populate, no DATABASE_URL');
				this.skippedPopulate = true;
				return;
			}

			if (!this.db) {
				return;
			}

			console.log('Start populate DB');

			try {
				const users = this.db.collection('users');

				console.log('Checking if the hash already exists');

				if (
					await users.findOne({
						_id: new RegExp(`${config.hash}${this.extraPrefix}`),
						roles: ['livechat-agent'],
					})
				) {
					console.log('Task skipped');
					this.skippedPopulate = true;
					return;
				}

				const results = await populateDatabase({
					userProps: {
						roles: ['livechat-agent'],
						extraPrefix: '-agent-',
						statusLivechat: 'available',
					},
					onlyUsers: true,
				});

				if (!isOnlyUserPopulation(results)) {
					return;
				}

				console.log(`Inserting users: ${results.users.length}`);

				await Promise.all([users.insertMany(results.users)]);

				console.log(results);
				this.usernames = results.users.map((user) => user.username);
				console.log('Done populating DB');
			} catch (e) {
				console.error(e);
			}
		}

		private getCurrentFromUsers(users: string[]): number[] {
			return users.map((username) => username.split('-')[4]).map(Number);
		}

		async stopdb() {
			await this.client?.close();
		}

		async setup() {
			if (!this.db) {
				return;
			}

			if (this.skippedPopulate) {
				console.log('finding users');
				// since no population was done, let's find some agents :)
				const users = this.db.collection('users');
				this.usernames = (
					await users
						.find(
							{
								_id: new RegExp(`${config.hash}${this.extraPrefix}`),
								roles: ['livechat-agent'],
							},
							{ projection: { username: 1 } }
						)
						.toArray()
				).map((user) => user.username);
			}

			console.log(this.usernames);
			agents = await getClients(
				config.HOW_MANY_USERS,
				this.extraPrefix,
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
		takeInquiry: config.TAKE_INQUIRY_PER_SEC,
	});

	b.on('ready', async () => {
		console.log('[AGENTS] Ready');
		await b.stopdb();
	});

	b.on('getRoutingConfig', async () => {
		const agent = rand(agents);
		await agent.getRoutingConfig();
		const { departments } = (await agent.getAgentDepartments()) || {
			departments: [],
		};
		const deps = departments.map((department) => department.departmentId);

		await agent.subscribeDeps(deps);
	});

	b.on('getQueuedInquiries', async () => {
		const agent = rand(agents);
		await agent.getQueuedInquiries();
	});

	b.on('takeInquiry', async () => {
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

	b.on('message', async () => {
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
