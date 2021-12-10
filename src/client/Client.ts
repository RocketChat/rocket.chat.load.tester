import RocketChatClient from '@rocket.chat/sdk/lib/clients/Rocketchat';

import { config } from '../config';
import { Subscription } from '../definifitons';
import { delay } from '../lib/delay';
import { username, email } from '../lib/ids';
import * as prom from '../lib/prom';
import { rand } from '../lib/rand';

const logger = {
	debug: (...args: any) => true || console.log(args),
	info: (...args: any) => true || console.log(args),
	warning: (...args: any) => true || console.log(args),
	warn: (...args: any) => true || console.log(args),
	error: (...args: any) => {
		console.error(args);
	},
};

const { SSL_ENABLED = 'no', LOG_IN = 'yes' } = process.env;

const useSsl =
	typeof SSL_ENABLED !== 'undefined'
		? ['yes', 'true'].includes(SSL_ENABLED)
		: true;

export type ClientType = 'web' | 'android' | 'ios';
export class Client {
	host: string;

	subscriptions: Subscription[] = [];

	type: ClientType;

	current: number;

	usersPresence: string[] = [];

	defaultCredentials = {
		username: 'loadtest%s',
		password: 'pass%s',
		email: 'loadtest%s@loadtest.com',
	};

	client: RocketChatClient;

	constructor(host: string, type: 'web' | 'android' | 'ios', current: number) {
		this.host = host;
		this.type = type;
		this.current = current;
		const client = new RocketChatClient({
			logger,
			host: this.host,
			useSsl,
		});

		this.client = client;
	}

	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		prom.connected.inc();

		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all([
					this.client.get('settings.public'),
					this.client.get('settings.oauth'),
				]);
				break;
		}

		// await loginOrRegister(client, credentials, type, current);
	}

	protected get credentials() {
		return {
			username: username(this.current),
			password: 'performance',
			email: email(this.current),
		};
	}

	protected async loginOrRegister(): Promise<void> {
		// if (tryRegister) {
		//   await register(client, credentials, type);
		// }

		try {
			if (!['yes', 'true'].includes(LOG_IN)) {
				return;
			}
			await this.login();
		} catch (e) {
			console.error('could not login/register for', this.credentials, e);
		}
	}

	async joinRoom(rid = 'GENERAL'): Promise<void> {
		const end = prom.roomJoin.startTimer();
		const endAction = prom.actions.startTimer({ action: 'joinRoom' });
		try {
			await this.client.joinRoom({ rid });
			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error joining room', { uid: this.client.userId, rid }, e);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}

	async setStatus(): Promise<void> {
		const status = rand(['online', 'away', 'offline', 'busy']);

		const endAction = prom.actions.startTimer({ action: 'setStatus' });
		try {
			await this.client.post('users.setStatus', { status });
			endAction({ status: 'success' });
		} catch (e) {
			endAction({ status: 'error' });
		}
	}

	async read(rid: string): Promise<void> {
		const endAction = prom.actions.startTimer({ action: 'read' });
		try {
			this.client.post('subscriptions.read', { rid });
			endAction({ status: 'success' });
		} catch (e) {
			endAction({ status: 'error' });
		}
	}

	async login(): Promise<void> {
		await this.beforeLogin();

		const end = prom.login.startTimer();
		const endAction = prom.actions.startTimer({ action: 'login' });
		const { credentials } = this;
		try {
			const user = await this.client.login(credentials);

			// do one by one as doing three at same time was hanging
			switch (this.type) {
				case 'android':
				case 'ios':
					await Promise.all(
						['rooms-changed', 'subscriptions-changed'].map((stream) =>
							this.client.subscribe(
								'stream-notify-user',
								`${user.id}/${stream}`
							)
						)
					);

					await Promise.all(
						['userData', 'activeUsers'].map((stream) =>
							this.client.subscribe(stream, '')
						)
					);

					await Promise.all([
						this.client.get('me'),
						this.client.get('permissions'),
						this.client.get('settings.public'),
						this.client.get('subscriptions.get'),
						this.client.get('rooms.get'),
					]);
					break;
			}

			await Promise.all(
				this.getLoginSubs().map(([stream, ...params]) =>
					this.client.subscribe(stream, ...params)
				)
			);

			await Promise.all(
				this.getLoginMethods().map((params) =>
					this.client.methodCall(...params)
				)
			);

			// client.loggedInInternal = true;
			// client.userCount = userCount;

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error during login', e, credentials);
			end({ status: 'error' });
			endAction({ status: 'error' });
			throw e;
		}
	}

	async listenPresence(_userIds: string[]): Promise<void> {
		throw new Error('not implemented');
	}

	protected getLoginMethods(): [string, string?][] {
		const methods: [string, string?][] = [];

		return methods;
	}

	protected getLoginSubs = (): [
		string,
		string,
		{ useCollection: false; args: [] }
	][] => {
		const subs: [string, string, { useCollection: false; args: [] }][] = [];

		return subs;
	};

	async sendMessage(msg: string, rid: string): Promise<void> {
		await this.typing(rid, true);
		await delay(1000);
		const endAction = prom.actions.startTimer({ action: 'sendMessage' });
		const end = prom.messages.startTimer();
		try {
			await this.client.sendMessage(msg, rid);
			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			end({ status: 'error' });
			endAction({ status: 'error' });
			throw e;
		}

		await this.typing(rid, false);
	}

	async typing(rid: string, typing: boolean): Promise<void> {
		this.client.methodCall(
			'stream-notify-room',
			`${rid}/typing`,
			this.client.username,
			typing
		);
	}

	async openRoom(rid = 'GENERAL', roomType = 'groups'): Promise<void> {
		const endAction = prom.actions.startTimer({ action: 'openRoom' });
		const end = prom.openRoom.startTimer();
		try {
			const calls: Promise<unknown>[] = [this.subscribeRoom(rid)];

			switch (this.type) {
				case 'android':
				case 'ios':
					calls.push(this.client.get('commands.list'));
					calls.push(this.client.get(`${roomType}.members`, { roomId: rid }));
					calls.push(this.client.get(`${roomType}.roles`, { roomId: rid }));
					calls.push(this.client.get(`${roomType}.history`, { roomId: rid }));
					break;
			}

			await Promise.all(calls);

			await this.client.post('subscriptions.read', { rid });

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error open room', { uid: this.client.userId, rid }, e);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}

	getRandomSubscription(): Subscription {
		const subscriptions = this.subscriptions.filter(
			(sub) =>
				config.IGNORE_ROOMS.indexOf(sub.rid) === -1 &&
				config.IGNORE_ROOMS.indexOf(sub.name) === -1
		);
		return rand(subscriptions);
	}

	async subscribeRoom(rid: string): Promise<void> {
		const end = prom.roomSubscribe.startTimer();
		const endAction = prom.actions.startTimer({ action: 'roomSubscribe' });
		try {
			await this.client.subscribeRoom(rid);

			const topic = 'stream-notify-room';
			await Promise.all([
				this.client.subscribe('stream-room-messages', rid),
				this.client.subscribe(topic, `${rid}/typing`),
				this.client.subscribe(topic, `${rid}/deleteMessage`),
			]);

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error(
				'error subscribing room',
				{ uid: this.client.userId, rid },
				e
			);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}
}
