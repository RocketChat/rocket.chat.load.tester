import type { Department, Inquiry, Subscription, Visitor } from '../definifitons';
import * as prom from '../lib/prom';
import { rand } from '../lib/rand';
import { Client } from './Client';
import { config } from '../config';

export class OmnichannelClient extends Client {
	getRandomLivechatSubscription(): Subscription {
		const subscriptions = this.subscriptions.filter(
			(sub) => config.IGNORE_ROOMS.indexOf(sub.rid) === -1 && config.IGNORE_ROOMS.indexOf(sub.name) === -1 && sub.t === 'l',
		);
		return rand(subscriptions);
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
			const departments = await this.get(`livechat/agents/${this.client.userId}/departments?enabledDepartmentsOnly=true`);

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
			const inquiries = await this.get(`livechat/inquiries.queuedForUser`, { userId: this.client.userId });

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
				this.subscribe(topic, 'public'), // always to public
				...deps.map(
					(department) => this.subscribe(topic, `department/${department}`), // and to deps, if any
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
			const inq = await this.get(`livechat/inquiries.getOne`, {
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
			const v = await this.get(`livechat/visitors.info`, {
				visitorId: vid,
			});
			end({ status: 'success' });
			return v;
		} catch (e) {
			end({ status: 'error' });
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
}
