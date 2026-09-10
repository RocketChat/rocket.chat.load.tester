import { Emitter } from '@rocket.chat/emitter';

type EventKeys =
	| 'message'
	| 'login'
	| 'logout'
	| 'presence'
	| 'subscription'
	| 'typing'
	| 'all'
	| 'here'
	| 'public-settings/get'
	| 'rooms/get'
	| 'spotlight'
	| 'loadMissedMessages'
	| 'rooms/get'
	| 'canAccessRoom'
	| 'getRoomRoles'
	| 'loadHistory'
	| 'setUserStatus'
	| 'readMessages'
	| 'openRoom'
	| 'subscribePresence'
	| 'getRoutingConfig'
	| 'getQueuedInquiries'
	| 'takeInquiry'
	| 'login';

/**
 * Events per second
 * Given a rate of per second, returns the value in milliseconds between each event
 * */
export const eventsPerSecond = (rate: number): number => Math.ceil(1000 / rate);

/**
 * Events per second per user
 * Given a rate of per second and the number of users, returns the value in milliseconds between each event
 * */
export const eventsPerUser = (ratePerSecond: number, users: number): number => eventsPerSecond(ratePerSecond) / users;

type Events<T> = { [k in EventKeys]?: T };

export abstract class BenchmarkRunner extends Emitter<
	{
		ready: undefined;
		populate_ready: undefined;
		error: unknown;
		timers: undefined;
	} & Events<unknown>
> {
	private readonly eventsRate: Map<EventKeys, number>;

	constructor(configuration: Events<number>) {
		super();
		this.eventsRate = new Map(Object.entries(configuration)) as Map<EventKeys, number>;

		const maxLabelLength = [...this.eventsRate].reduce((max, [key]) => Math.max(max, key.length), 0);

		console.log('Events configuration:');
		for (const [event, rate] of this.eventsRate) {
			console.log(`${event.padStart(maxLabelLength)} -> ${rate} events per second`);
		}
		console.log('-------------------');

		this.on('ready', () => this.turnOnTimers());
		this.on('error', (error: unknown) => {
			console.error(error);
			process.exit(1);
		});
	}

	private turnOnTimers(): void {
		for (const [event, rate] of this.eventsRate) {
			if (!rate) {
				continue;
			}
			const register = () =>
				setTimeout(() => {
					this.emit(event, undefined);
					register();
				}, this.getEventDelay(rate, event));

			register();
		}
		this.emit('timers');
	}

	public async run(): Promise<void> {
		try {
			await this.populate();

			this.emit('populate_ready');

			await this.setup();

			this.emit('ready');
		} catch (error) {
			this.emit('error', error);
		}
	}

	abstract setup(): Promise<void>;

	abstract populate(): Promise<void>;

	/**
	 * Given a rate of per second, returns the value in milliseconds between each event
	 * */
	public getEventDelay(rate: number, _name: string): number {
		return eventsPerSecond(rate);
	}
}
