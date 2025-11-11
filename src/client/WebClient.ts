import type { Subscription } from '../definifitons';
import * as prom from '../lib/prom';
import { Client } from './Client';
import { action, suppressError } from './decorators';

export class WebClient extends Client {
	loginPromise: Promise<void> | undefined;

	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		prom.connected.inc();

		await this.methodAnonViaRest('public-settings/get');

		await this.httpGet('/api/apps/actionButtons');

		// this is done to simulate web client
		await this.subscribe('meteor.loginServiceConfiguration');
		await this.subscribe('meteor_autoupdate_clientVersions');

		// await subscribeNotifyAll();
		await Promise.all(['public-settings-changed'].map((event) => this.subscribe('stream-notify-all', event, false)));
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

		await this.get(`users.presence?ids[]=${newIds.join('&ids[]=')}&_empty=`);

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
		methods.push(['loadLocale', 'pt-BR']);
		methods.push(['getUserRoles']);
		methods.push(['livechat:getRoutingConfig']);
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
			this.methodViaRest('getRoomRoles', rid),
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
