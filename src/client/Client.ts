import { URLSearchParams } from 'url';

import { DDPSDK } from '@rocket.chat/ddp-client';
import EJSON from 'ejson';
import fetch from 'node-fetch';
import type { UserStatus } from '@rocket.chat/core-typings';

import { config } from '../config';
import type { Subscription } from '../definifitons';
import { delay } from '../lib/delay';
import { username, email } from '../lib/ids';
import * as prom from '../lib/prom';
import { rand } from '../lib/rand';
import { action, errorLogger, suppressError } from './decorators';

const { LOG_IN = 'yes' } = process.env;

export type ClientType = 'web' | 'android' | 'ios';

declare module '@rocket.chat/rest-typings' {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Endpoints {
		'/v1/permissions': {
			get: () => unknown;
		};
	}
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ClientLoadTest {
	status: 'logged' | 'not-logged' | 'logging';

	joinRoom(rid: string): Promise<void>;

	setStatus(): Promise<void>;

	read(rid: string): Promise<void>;

	login(): Promise<void>;

	sendMessage(msg: string, rid: string): Promise<void>;

	typing(rid: string, typing: boolean): Promise<void>;

	openRoom(rid: string, roomType: 'groups' | 'channels'): Promise<void>;

	subscribeRoom(rid: string): Promise<void>;

	beforeLogin(): Promise<void>;

	getRandomSubscription(): Subscription | undefined;

	get: DDPSDK['rest']['get'];

	post: DDPSDK['rest']['post'];

	subscribe: DDPSDK['client']['subscribe'];
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

	client: DDPSDK;

	subscribedToLivechat = false;

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

		this.client = DDPSDK.create(this.host);

		this.get = prom.promWrapperRest('GET', this.client.rest.get);
		this.post = prom.promWrapperRest('POST', this.client.rest.post);

		this.subscribe = prom.promWrapperSubscribe(this.client.client.subscribe);
	}

	status: 'logged' | 'not-logged' | 'logging' = 'not-logged';

	get: DDPSDK['rest']['get'];

	post: DDPSDK['rest']['post'];

	subscribe: DDPSDK['client']['subscribe'];

	@suppressError
	@action
	async beforeLogin(): Promise<void> {
		await this.client.client.connect();

		prom.connected.inc();

		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all([this.get('/v1/settings.public'), this.get('/v1/settings.oauth')]);
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
		await this.client.rest.post('/v1/channels.join', { roomId: rid });
	}

	@suppressError
	@action
	async setStatus() {
		const status = rand(['online', 'away', 'offline', 'busy']) as UserStatus;

		await this.post('/v1/users.setStatus', { status });
	}

	@suppressError
	@action
	async read(rid: string): Promise<void> {
		await this.post('/v1/subscriptions.read', { rid });
	}

	@suppressError
	@action
	async login() {
		await this.beforeLogin();

		const { credentials } = this;

		await this.client.account.loginWithPassword(credentials.username, credentials.password);

		// do one by one as doing three at same time was hanging
		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all(
					['rooms-changed', 'subscriptions-changed'].map((stream) =>
						this.subscribe('stream-notify-user', `${this.client.account.uid!}/${stream}`),
					),
				);

				await Promise.all(['userData', 'activeUsers'].map((stream) => this.subscribe(stream, '')));

				await Promise.all([
					this.get('/v1/me'),
					this.get('/v1/permissions' as any),
					this.get('/v1/settings.public'),
					this.get('/v1/subscriptions.get', {}),
					this.get('/v1/rooms.get', {} as any),
				]);
				break;
		}

		await Promise.all(this.getLoginSubs().map(([stream, ...params]) => this.subscribe(stream, ...params)));

		await Promise.all(this.getLoginMethods().map((params) => this.client.call(...params)));

		this.status = 'logged';
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

		await this.client.rest.post('/v1/chat.sendMessage', { message: { msg, rid } });

		await this.typing(rid, false);
	}

	@suppressError
	@action
	async typing(rid: string, typing: boolean): Promise<void> {
		await this.client.call('stream-notify-room', `${rid}/typing`, this.client.account.user!.username!, typing);
	}

	@suppressError
	@action
	async openRoom(rid = 'GENERAL', roomType: 'groups' | 'channels' = 'groups'): Promise<void> {
		const calls: Promise<unknown>[] = [this.subscribeRoom(rid)];

		switch (this.type) {
			case 'android':
			case 'ios':
				calls.push(this.get('/v1/commands.list'));
				calls.push(this.get(`/v1/${roomType}.members`, { roomId: rid }));
				calls.push(this.get(`/v1/${roomType}.roles`, { roomId: rid }));
				calls.push(this.get(`/v1/${roomType}.history`, { roomId: rid }));
				break;
		}

		await Promise.all(calls);

		await this.post('/v1/subscriptions.read', { rid });
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

		const result = await this.post(`${anon ? '/v1/method.callAnon' : '/v1/method.call'}/${encodeURIComponent(method)}`, {
			message,
		});

		const msgResult = EJSON.parse(result.message as unknown as string);

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
