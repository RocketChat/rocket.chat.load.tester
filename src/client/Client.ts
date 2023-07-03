import fs from 'fs';
import path from 'path';
import { URLSearchParams } from 'url';

import RocketChatClient from '@rocket.chat/sdk/lib/clients/Rocketchat';
import EJSON from 'ejson';
import FormData from 'form-data';
import type { BodyInit, RequestInit } from 'node-fetch';
import fetch from 'node-fetch';

import { config } from '../config';
import type { Subscription, Department, Inquiry, Visitor } from '../definifitons';
import { delay } from '../lib/delay';
import { getRandomFileFromFolder } from '../lib/file';
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

const useSsl = typeof SSL_ENABLED !== 'undefined' ? ['yes', 'true'].includes(SSL_ENABLED) : true;

export type ClientType = 'web' | 'android' | 'ios';
export class Client {
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
	}

	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		prom.connected.inc();

		switch (this.type) {
			case 'android':
			case 'ios':
				await Promise.all([this.client.get('settings.public'), this.client.get('settings.oauth')]);
				break;
		}

		// await loginOrRegister(client, credentials, type, current);
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
		if (!this.loggedIn) {
			await this.login();
		}

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
		if (!this.loggedIn) {
			await this.login();
		}

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
		if (!this.loggedIn) {
			await this.login();
		}

		const endAction = prom.actions.startTimer({ action: 'read' });
		try {
			await this.client.post('subscriptions.read', { rid });
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
						['rooms-changed', 'subscriptions-changed'].map((stream) => this.client.subscribe('stream-notify-user', `${user.id}/${stream}`)),
					);

					await Promise.all(['userData', 'activeUsers'].map((stream) => this.client.subscribe(stream, '')));

					await Promise.all([
						this.client.get('me'),
						this.client.get('permissions'),
						this.client.get('settings.public'),
						this.client.get('subscriptions.get'),
						this.client.get('rooms.get'),
					]);
					break;
			}

			await Promise.all(this.getLoginSubs().map(([stream, ...params]) => this.client.subscribe(stream, ...params)));

			await Promise.all(this.getLoginMethods().map((params) => this.client.methodCall(...params)));

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

	async sendMessage(msg: string, rid: string): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

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

	async uploadFile(rid: string): Promise<void> {
		if (!this.client.currentLogin) {
			return;
		}

		const folderPath = path.join(__dirname, '..', '..', 'assets');

		const { fullPath: filePath } = getRandomFileFromFolder(folderPath);

		const { authToken, userId } = this.client.currentLogin;

		const endAction = prom.actions.startTimer({ action: 'uploadFile' });
		try {
			const fileFormData = new FormData();

			fileFormData.append('file', fs.createReadStream(filePath));

			await this.httpPost(`/api/v1/rooms.upload/${rid}`, {
				body: fileFormData as unknown as BodyInit,
				headers: {
					'X-Auth-Token': authToken,
					'X-User-Id': userId,
					'Content-Type': `multipart/form-data; boundary=${fileFormData.getBoundary()}`,
				},
			});

			endAction({ status: 'success' });
		} catch (e) {
			endAction({ status: 'error' });
			throw e;
		}
	}

	async typing(rid: string, typing: boolean): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		await this.client.methodCall('stream-notify-room', `${rid}/typing`, this.client.username, typing);
	}

	async openRoom(rid = 'GENERAL', roomType = 'groups'): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

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

	async openLivechatRoom(_rid: string, _vid: string): Promise<void> {
		// do nothing
	}

	getRandomSubscription(): Subscription {
		const subscriptions = this.subscriptions.filter(
			(sub) => config.IGNORE_ROOMS.indexOf(sub.rid) === -1 && config.IGNORE_ROOMS.indexOf(sub.name) === -1,
		);
		return rand(subscriptions);
	}

	getRandomLivechatSubscription(): Subscription {
		const subscriptions = this.subscriptions.filter(
			(sub) => config.IGNORE_ROOMS.indexOf(sub.rid) === -1 && config.IGNORE_ROOMS.indexOf(sub.name) === -1 && sub.t === 'l',
		);
		return rand(subscriptions);
	}

	async subscribeRoom(rid: string): Promise<void> {
		const end = prom.roomSubscribe.startTimer();
		const endAction = prom.actions.startTimer({ action: 'roomSubscribe' });
		try {
			// await this.client.subscribeRoom(rid);

			const topic = 'stream-notify-room';
			await Promise.all([
				this.client.subscribe('stream-room-messages', rid),
				this.client.subscribe(topic, `${rid}/typing`),
				this.client.subscribe(topic, `${rid}/deleteMessage`),
			]);

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error subscribing room', { uid: this.client.userId, rid }, e);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}

	async getRoutingConfig(): Promise<{ [k: string]: string } | undefined> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'getRoutingConfig' });
		try {
			const routingConfig = await this.client.methodCall('livechat:getRoutingConfig');

			end({ status: 'success' });
			return routingConfig;
		} catch (e) {
			end({ status: 'error' });
		}
	}

	async getAgentDepartments(): Promise<{ departments: Department[] } | undefined> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'getAgentDepartments' });
		try {
			const departments = await this.client.get(`livechat/agents/${this.client.userId}/departments?enabledDepartmentsOnly=true`);

			end({ status: 'success' });
			return departments;
		} catch (e) {
			end({ status: 'error' });
		}
	}

	async getQueuedInquiries(): Promise<{ inquiries: Inquiry[] } | undefined> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'getQueuedInquiries' });
		try {
			const inquiries = await this.client.get(`livechat/inquiries.queuedForUser`, { userId: this.client.userId });

			end({ status: 'success' });
			return inquiries;
		} catch (e) {
			end({ status: 'error' });
		}
	}

	async subscribeDeps(deps: string[]): Promise<void> {
		if (this.subscribedToLivechat) {
			return;
		}

		if (!this.loggedIn) {
			await this.login();
		}

		try {
			const topic = 'livechat-inquiry-queue-observer';

			await Promise.all([
				this.client.subscribe(topic, 'public'), // always to public
				...deps.map(
					(department) => this.client.subscribe(topic, `department/${department}`), // and to deps, if any
				),
			]);
			this.subscribedToLivechat = true;
		} catch (e) {
			console.error('error subscribing to livechat', e);
			this.subscribedToLivechat = false;
		}
	}

	async takeInquiry(id: string): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'takeInquiry' });
		const endInq = prom.inquiryTaken.startTimer();
		try {
			await this.client.methodCall('livechat:takeInquiry', id, {
				clientAction: true,
			});
			end({ status: 'success' });
			endInq({ status: 'success' });
		} catch (e) {
			end({ status: 'error' });
			endInq({ status: 'error' });
		}
	}

	async getInquiry(id: string): Promise<Inquiry | undefined> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'getOneInquiry' });
		try {
			const inq = await this.client.get(`livechat/inquiries.getOne`, {
				roomId: id,
			});

			end({ status: 'success' });
			return inq;
		} catch (e) {
			end({ status: 'error' });
		}
	}

	async getVisitorInfo(vid: string): Promise<Visitor | undefined> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.actions.startTimer({ action: 'getVisitorInfo' });
		try {
			const v = await this.client.get(`livechat/visitors.info`, {
				visitorId: vid,
			});
			end({ status: 'success' });
			return v;
		} catch (e) {
			end({ status: 'error' });
		}
	}

	private async methodCallRest({ method, params, anon }: { method: string; params: unknown[]; anon?: boolean }) {
		const message = EJSON.stringify({
			msg: 'method',
			id: 1001,
			method,
			params,
		});

		const result = await this.client.post(`${anon ? 'method.callAnon' : 'method.call'}/${encodeURIComponent(method)}`, {
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

	protected async httpPost(endpoint: string, init?: RequestInit): Promise<unknown> {
		const result = await fetch(`${this.host}${endpoint}`, {
			method: 'POST',
			...init,
		});
		return result.json();
	}
}
