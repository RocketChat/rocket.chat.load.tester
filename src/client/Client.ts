import { URLSearchParams } from 'url';

import RocketChatClient from '@rocket.chat/sdk/lib/clients/Rocketchat';
import EJSON from 'ejson';
import fetch from 'node-fetch';
import type Api from '@rocket.chat/sdk/lib/api/api';
import type { IAPIRequest, ISubscription } from '@rocket.chat/sdk/interfaces';

import { config } from '../config';
import type { Subscription } from '../definifitons';
import { delay } from '../lib/delay';
import { username, email } from '../lib/ids';
import * as prom from '../lib/prom';
import { rand } from '../lib/rand';
import { action, errorLogger, suppressError } from './decorators';

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

const useSsl = typeof SSL_ENABLED !== 'undefined' ? ['yes', 'true'].includes(SSL_ENABLED) : true;

export type ClientType = 'web' | 'android' | 'ios';

// eslint-disable-next-line @typescript-eslint/naming-convention
interface ClientLoadTest {
	joinRoom(rid: string): Promise<void>;

	setStatus(): Promise<void>;

	read(rid: string): Promise<void>;

	login(): Promise<void>;

	sendMessage(msg: string, rid: string): Promise<void>;

	typing(rid: string, typing: boolean): Promise<void>;

	openRoom(rid: string, roomType: string): Promise<void>;

	subscribeRoom(rid: string): Promise<void>;

	beforeLogin(): Promise<void>;

	getRandomSubscription(): Subscription | undefined;

	get: Api['get'];

	post: Api['post'];

	subscribe: RocketChatClient['subscribe'];
}

export class Client implements ClientLoadTest {
	host: string;

	subscriptions: Subscription[] = [];

	type: ClientType;

	current: number;

	extraPrefix: string;

	usersPresence: string[] = [];

	defaultCredentials:
		| {
				email: string;
				password: string;
				username: string;
		  }
		| undefined = undefined;

	client: RocketChatClient;

	subscribedToLivechat = false;

	loggedIn = false;

	constructor(
		host: string,
		type: 'web' | 'android' | 'ios',
		current: number,
		extraPrefix = '',
		credentials?: { username: string; password: string; email: string },
	) {
		this.host = host;
		this.type = type;
		this.current = current;
		this.extraPrefix = extraPrefix;

		if (credentials) {
			this.defaultCredentials = credentials;
		}

		const client = new RocketChatClient({
			logger,
			host: this.host,
			useSsl,
		});

		this.client = client;

		this.get = prom.promWrapperRest('GET', (...args) => this.client.get(...args));
		this.post = prom.promWrapperRest('POST', (...args) => this.client.post(...args));

		this.subscribe = prom.promWrapperSubscribe((...args) => this.client.subscribe(...args));
	}

	get: IAPIRequest;

	post: IAPIRequest;

	subscribe: (topic: string, ...args: any[]) => Promise<ISubscription>;

	@suppressError
	@action
	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		prom.connected.inc();

		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all([this.get('settings.public'), this.get('settings.oauth')]);
				break;
		}
	}

	getManyPresences(): number {
		return Math.min(config.HOW_MANY_USERS, config.INITIAL_SUBSCRIBE_MIN, config.HOW_MANY_USERS * config.INITIAL_SUBSCRIBE_RATIO);
	}

	protected get credentials(): {
		username: string;
		password: string;
		email: string;
	} {
		return (
			this.defaultCredentials || {
				username: username(this.current, this.extraPrefix),
				password: 'performance',
				email: email(this.current, this.extraPrefix),
			}
		);
	}

	get username(): string {
		return this.credentials.username;
	}

	@errorLogger
	protected async loginOrRegister(): Promise<void> {
		if (!['yes', 'true'].includes(LOG_IN)) {
			return;
		}
		await this.login();
	}

	@suppressError
	@action
	async joinRoom(rid = 'GENERAL') {
		await this.client.joinRoom({ rid });
	}

	@suppressError
	@action
	async setStatus() {
		const status = rand(['online', 'away', 'offline', 'busy']);

		await this.post('users.setStatus', { status });
	}

	@suppressError
	@action
	async read(rid: string): Promise<void> {
		await this.post('subscriptions.read', { rid });
	}

	@suppressError
	@action
	async login() {
		await this.beforeLogin();

		const { credentials } = this;

		const user = await this.client.login(credentials);

		// do one by one as doing three at same time was hanging
		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all(
					['rooms-changed', 'subscriptions-changed'].map((stream) => this.subscribe('stream-notify-user', `${user.id}/${stream}`)),
				);

				await Promise.all(['userData', 'activeUsers'].map((stream) => this.subscribe(stream, '')));

				await Promise.all([
					this.get('me'),
					this.get('permissions'),
					this.get('settings.public'),
					this.get('subscriptions.get'),
					this.get('rooms.get'),
				]);
				break;
		}

		await Promise.all(this.getLoginSubs().map(([stream, ...params]) => this.subscribe(stream, ...params)));

		await Promise.all(this.getLoginMethods().map((params) => this.client.methodCall(...params)));

		this.loggedIn = true;
	}

	async listenPresence(_userIds: string[]): Promise<void> {
		throw new Error('not implemented');
	}

	protected getLoginMethods(): [string, string?][] {
		const methods: [string, string?][] = [];

		return methods;
	}

	protected getLoginSubs = (): [string, string, { useCollection: false; args: [] }][] => {
		const subs: [string, string, { useCollection: false; args: [] }][] = [];

		return subs;
	};

	@suppressError
	@action
	async sendMessage(msg: string, rid: string): Promise<void> {
		await this.typing(rid, true);
		await delay(1000);

		try {
			await this.client.sendMessage(msg, rid);
		} catch (e) {
			throw e;
		}

		await this.typing(rid, false);
	}

	@suppressError
	@action
	async typing(rid: string, typing: boolean): Promise<void> {
		await this.client.methodCall('stream-notify-room', `${rid}/typing`, this.client.username, typing);
	}

	@suppressError
	@action
	async openRoom(rid = 'GENERAL', roomType = 'groups'): Promise<void> {
		try {
			const calls: Promise<unknown>[] = [this.subscribeRoom(rid)];

			switch (this.type) {
				case 'android':
				case 'ios':
					calls.push(this.get('commands.list'));
					calls.push(this.get(`${roomType}.members`, { roomId: rid }));
					calls.push(this.get(`${roomType}.roles`, { roomId: rid }));
					calls.push(this.get(`${roomType}.history`, { roomId: rid }));
					break;
			}

			await Promise.all(calls);

			await this.post('subscriptions.read', { rid });
		} catch (e) {
			console.error('error open room', { uid: this.client.userId, rid }, e);
		}
	}

	getRandomSubscription(): Subscription {
		const subscriptions = this.subscriptions.filter(
			(sub) => config.IGNORE_ROOMS.indexOf(sub.rid) === -1 && config.IGNORE_ROOMS.indexOf(sub.name) === -1,
		);
		return rand(subscriptions);
	}

	@suppressError
	@action
	async subscribeRoom(rid: string): Promise<void> {
		const topic = 'stream-notify-room';
		await Promise.all([
			this.subscribe('stream-room-messages', rid),
			this.subscribe(topic, `${rid}/typing`),
			this.subscribe(topic, `${rid}/deleteMessage`),
		]);
	}

	private async methodCallRest({ method, params, anon }: { method: string; params: unknown[]; anon?: boolean }) {
		const message = EJSON.stringify({
			msg: 'method',
			id: 1001,
			method,
			params,
		});

		const result = await this.post(`${anon ? 'method.callAnon' : 'method.call'}/${encodeURIComponent(method)}`, {
			message,
		});

		if (!result.success) {
			throw new Error(result.error);
		}

		const msgResult = EJSON.parse(result.message);

		return msgResult.result;
	}

	protected async methodViaRest(method: string, ...params: unknown[]): Promise<unknown> {
		return this.methodCallRest({ method, params });
	}

	protected async methodAnonViaRest(method: string, ...params: unknown[]): Promise<unknown> {
		return this.methodCallRest({ method, params, anon: true });
	}

	protected async httpGet(endpoint: string, query?: URLSearchParams): Promise<unknown> {
		const qs = query ? `?${new URLSearchParams(query)}` : '';

		const result = await fetch(`${this.host}${endpoint}${qs}`, {
			method: 'GET',
			...(query && { body: JSON.stringify(query) }),
		});
		return result.json();
	}
}
