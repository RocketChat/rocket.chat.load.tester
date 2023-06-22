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
	| 'uploadFile';

const eventsPerSecond = (events: number): number => Math.ceil(1000 / events);

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
		this.eventsRate = new Map(Object.entries(configuration)) as Map<
			EventKeys,
			number
		>;

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
			setInterval(() => {
				this.emit(event, undefined);
			}, eventsPerSecond(rate));
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
}
