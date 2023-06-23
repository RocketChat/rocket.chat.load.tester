import { Subscription } from '../definifitons';
import * as prom from '../lib/prom';
import { Client } from './Client';

export class WebClient extends Client {
	loginPromise: Promise<void> | undefined;

	async beforeLogin(): Promise<void> {
		await this.client.connect({});

		prom.connected.inc();

		await this.methodAnonViaRest('public-settings/get');

		await this.httpGet('/api/apps/actionButtons');

		// this is done to simulate web client
		await this.client.subscribe('meteor.loginServiceConfiguration');
		await this.client.subscribe('meteor_autoupdate_clientVersions');

		// await client.subscribeNotifyAll();
		await Promise.all(
			['public-settings-changed'].map((event) =>
				this.client.subscribe('stream-notify-all', event, false)
			)
		);
	}

	async login(): Promise<void> {
		if (this.loginPromise) {
			return this.loginPromise;
		}

		this.loginPromise = new Promise(async (resolve) => {
			const end = prom.login.startTimer();
			const endAction = prom.actions.startTimer({ action: 'login' });

			const { credentials } = this;

			try {
				await this.beforeLogin();

				const user = await this.client.login(credentials);

				// await this.client.subscribeLoggedNotify();
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
					].map((event) =>
						this.client.subscribe('stream-notify-logged', event, false)
					)
				);

				// await client.subscribeNotifyUser();
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
					].map((event) =>
						this.client.subscribe(
							'stream-notify-user',
							`${user.id}/${event}`,
							false
						)
					)
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
					].map((event) => this.client.subscribe('stream-apps', event, false))
				);

				await Promise.all(
					this.getLoginMethods().map((params) => this.methodViaRest(...params))
				);

				const subscriptions = await this.methodViaRest('subscriptions/get', {});

				this.subscriptions = subscriptions as unknown as Subscription[];

				this.loggedIn = true;

				end({ status: 'success' });
				endAction({ action: 'login', status: 'success' });
			} catch (e) {
				console.error('error during login', e, credentials);
				end({ status: 'error' });
				endAction({ action: 'login', status: 'error' });
				throw e;
			} finally {
				resolve();
			}
		});

		return this.loginPromise;
	}

	async listenPresence(userIds: string[]): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		const endAction = prom.actions.startTimer({ action: 'listenPresence' });

		try {
			const newIds = userIds.filter((id) => !this.usersPresence.includes(id));
			const removeIds = this.usersPresence.filter(
				(id) => !userIds.includes(id)
			);

			await this.client.get(
				`users.presence?ids[]=${newIds.join('&ids[]=')}&_empty=`
			);

			((await this.client.socket) as any).ddp.subscribe(
				'stream-user-presence',
				[
					'',
					{
						...(newIds && { added: newIds }),
						...(removeIds && { removed: removeIds }),
					},
				]
			);

			this.usersPresence = [...new Set(userIds)];

			endAction({ action: 'listenPresence', status: 'success' });
		} catch (e) {
			endAction({ action: 'listenPresence', status: 'error' });
		}
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

	async typing(rid: string, typing: boolean): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		this.client.methodCall(
			'stream-notify-room',
			`${rid}/user-activity`,
			this.client.username,
			typing
		);
	}

	async openRoom(rid = 'GENERAL'): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.openRoom.startTimer();
		const endAction = prom.actions.startTimer({ action: 'openRoom' });
		try {
			await Promise.all([
				this.subscribeRoom(rid),
				this.methodViaRest('loadHistory', rid, null, 50, new Date()),
				this.methodViaRest('getRoomRoles', rid),
			]);

			await this.read(rid);

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error open room', { uid: this.client.userId, rid }, e);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}

	async openLivechatRoom(rid: string, vid: string): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.openRoom.startTimer();
		const endAction = prom.actions.startTimer({ action: 'openRoom' });
		try {
			await Promise.all([
				this.subscribeRoom(rid),
				this.methodViaRest('loadHistory', rid, null, 50, new Date()),
				this.methodViaRest('getRoomRoles', rid),
				this.getVisitorInfo(vid),
			]);

			end({ status: 'success' });
			endAction({ status: 'success' });
		} catch (e) {
			console.error('error open room', { uid: this.client.userId, rid }, e);
			end({ status: 'error' });
			endAction({ status: 'error' });
		}
	}

	async subscribeRoom(rid: string): Promise<void> {
		if (!this.loggedIn) {
			await this.login();
		}

		const end = prom.roomSubscribe.startTimer();
		const endAction = prom.actions.startTimer({ action: 'subscribeRoom' });
		try {
			// await this.client.subscribeRoom(rid);

			const topic = 'stream-notify-room';
			await Promise.all([
				this.client.subscribe('stream-room-messages', rid),
				this.client.subscribe(topic, `${rid}/user-activity`),
				this.client.subscribe(topic, `${rid}/deleteMessage`),
				this.client.subscribe(topic, `${rid}/deleteMessageBulk`),
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
