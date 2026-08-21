import type { Subscription } from '../definifitons';
import * as prom from '../lib/prom';
import { Client } from './Client';
import { action, suppressError } from './decorators';

export class WebClient extends Client {
	loginPromise: Promise<void> | undefined;

	@suppressError
	@action
	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		await this.methodAnonViaRest('public-settings/get');

		await this.httpGet('/api/apps/actionButtons');

		// this is done to simulate web client
		await this.subscribe('meteor.loginServiceConfiguration');
		await this.subscribe('meteor_autoupdate_clientVersions');

		// await subscribeNotifyAll();
		await Promise.all(['public-settings-changed'].map((event) => this.subscribe('stream-notify-all', event, false)));

		prom.connected.inc();
	}

	@suppressError
	@action
	async login(): Promise<void> {
		if (this.status === 'logged') {
			throw new Error('Already logged in');
		}

		if (this.status === 'logging') {
			throw new Error('Already logging in');
		}

		// TODO if an error happens, we should rollback the status to not-logged
		this.status = 'logging';

		const { credentials } = this;

		await this.beforeLogin();

		const user = await this.client.login(credentials);

		// await this.subscribeLoggedNotify();
		await Promise.all(
			[
				'deleteCustomSound',
				'updateCustomSound',
				'updateEmojiCustom',
				'deleteEmojiCustom',
				'deleteCustomUserStatus',
				'updateCustomUserStatus',
				'banner-changed',
				'updateAvatar',
				'Users:NameChanged',
				'Users:Deleted',
				'roles-change',
				'voip.statuschanged',
				'permissions-changed',
			].map((event) => this.subscribe('stream-notify-logged', event, false)),
		);

		// await subscribeNotifyUser();
		await Promise.all(
			[
				'uiInteraction',
				'video-conference',
				'force_logout',
				'message',
				'subscriptions-changed',
				'notification',
				'otr',
				'rooms-changed',
				'webrtc',
				'userData',
			].map((event) => this.subscribe('stream-notify-user', `${user.id}/${event}`, false)),
		);

		await Promise.all(
			[
				'app/added',
				'app/removed',
				'app/updated',
				'app/settingUpdated',
				'command/added',
				'command/disabled',
				'command/updated',
				'command/removed',
				'actions/changed',
			].map((event) => this.subscribe('stream-apps', event, false)),
		);

		await this.get('roles.list');

		await Promise.all(this.getLoginMethods().map((params) => this.methodViaRest(...params)));

		const subscriptions = await this.methodViaRest('subscriptions/get', {});

		this.subscriptions = subscriptions as unknown as Subscription[];

		this.status = 'logged';
	}

	@suppressError
	@action
	async listenPresence(userIds: string[]): Promise<void> {
		const newIds = userIds.filter((id) => !this.usersPresence.includes(id));
		const removeIds = this.usersPresence.filter((id) => !userIds.includes(id));

		// Rocket.Chat >= 8.4.0 validates this query with additionalProperties: false, so any
		// extra param is rejected with a 400. The ids are sent as a single comma separated
		// string because the server splits it and it is not subject to the qs arrayLimit of
		// 500 that applies to ids[] style arrays. Chunks of 100 keep the URL around 4KB:
		// tester ids are ~40 chars each, and requests fail once the URL passes nginx's
		// default 8KB request line limit or Node's 16KB header limit.
		for (let offset = 0; offset < newIds.length; offset += 100) {
			// eslint-disable-next-line no-await-in-loop
			await this.get('users.presence', { ids: newIds.slice(offset, offset + 100).join(',') });
		}

		((await this.client.socket) as any).ddp.subscribe('stream-user-presence', [
			'',
			{
				...(newIds && { added: newIds }),
				...(removeIds && { removed: removeIds }),
			},
		]);

		this.usersPresence = [...new Set(userIds)];
	}

	protected getLoginMethods(): [string, string?][] {
		const methods: [string, string?][] = [];

		methods.push(['license:getModules']);
		methods.push(['listCustomSounds']);
		methods.push(['listCustomUserStatus']);
		methods.push(['license:isEnterprise']);
		// methods.push(['loadLocale', 'pt-BR']);

		// TODO replaced by /v1/livechat/config/routing and /api/v1/livechat/priorities
		// methods.push(['livechat:getRoutingConfig']);

		methods.push(['rooms/get']);
		methods.push(['permissions/get']);

		// following requests are performed by admins only, no need to be performed by load test
		// methods.push(['autoTranslate.getProviderUiMetadata']);
		// methods.push(['autoTranslate.getSupportedLanguages', 'en']);
		// methods.push(['cloud:checkRegisterStatus']);

		return methods;
	}

	@suppressError
	@action
	async typing(rid: string, typing: boolean): Promise<void> {
		await this.client.methodCall('stream-notify-room', `${rid}/user-activity`, this.client.username, typing ? ['user-typing'] : []);
	}

	@suppressError
	@action
	async openRoom(rid = 'GENERAL'): Promise<void> {
		await Promise.all([
			this.subscribeRoom(rid),
			this.methodViaRest('loadHistory', rid, null, 50, new Date()),
			this.get('rooms.roles', { rid }),
		]);

		await this.read(rid);
	}

	@suppressError
	@action
	async subscribeRoom(rid: string): Promise<void> {
		const topic = 'stream-notify-room';
		await Promise.all([
			this.subscribe('stream-room-messages', rid),
			this.subscribe(topic, `${rid}/user-activity`),
			this.subscribe(topic, `${rid}/deleteMessage`),
			this.subscribe(topic, `${rid}/deleteMessageBulk`),
		]);
	}
}
