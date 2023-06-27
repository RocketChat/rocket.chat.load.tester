import { config } from './config';
import type { Room, Subscription, User, Storable } from './definifitons';
import { roomId, subscriptionId, username, email, userId } from './lib/ids';

const today = new Date();

const userBase = {
	createdAt: today,
	services: {
		password: {
			bcrypt: '$2b$10$gPTtjX0DUHOPYfYyIeGMauXu3/AqnrqVZ/GnfOMUzy1U6AE4PIiQi', // performance
		},
		resume: {
			loginTokens: [],
		},
	},
	emails: [{ verified: false }],
	type: 'user',
	status: 'offline',
	active: true,
	_updatedAt: today,
	roles: ['user'],
	lastLogin: today,
	statusConnection: 'offline',
	__rooms: [],
};

const cache: { [k: string]: User } = {};

function createUser(
	uid: string,
	count: number,
	room?: Room,
	options?: {
		userProps?: {
			roles?: string[];
			extraPrefix?: string;
			[k: string]: unknown;
		};
		onlyUsers?: boolean;
	},
) {
	if (cache[uid]) {
		return cache[uid];
	}
	const { roles, extraPrefix, ...props } = options?.userProps || {};
	let user = JSON.parse(JSON.stringify(userBase));
	user = { ...user, ...props };

	user._id = uid;
	user.username = username(count, options?.userProps?.extraPrefix);
	user.name = `Test User No ${uid}`;
	user.roles = options?.userProps?.roles || ['user'];
	if (user.emails) {
		user.emails[0].address = email(count);
	}
	room && user.__rooms.push(room._id);
	cache[uid] = user;
	return user;
}

function createRoom(i: number, usersPerRoom: number, prefix: string): Room {
	return {
		_id: roomId(i),
		name: `${prefix}-${i}`,
		fname: `${prefix}-${i}`,
		t: 'p',
		msgs: 0,
		usersCount: usersPerRoom,
		u: {
			_id: '',
			username: '',
		},
		customFields: {},
		broadcast: false,
		encrypted: false,
		ts: today,
		ro: false,
		default: false,
		sysMes: true,
		_updatedAt: today,
	};
}

function createSubscription(room: Room, { _id, username }: User) {
	return {
		_id: subscriptionId(room, { _id }),
		rid: room._id,
		name: room.name,
		fname: room.fname,
		open: true,
		alert: false,
		unread: 0,
		userMentions: 0,
		groupMentions: 0,
		ts: today,
		t: 'p',
		u: { _id, username },
		_updatedAt: today,
		ls: today,
	};
}

const produceRooms = async (
	totalRooms: number,
	usersPerRoom: number,
	prefix: string,
	options?: {
		userProps?: {
			roles?: string[];
			extraPrefix?: string;
			[k: string]: unknown;
		};
		onlyUsers?: boolean;
	},
): Promise<{ rooms: any[]; users: any[]; subscriptions: any[] }> => {
	const result: { rooms: any[]; users: Set<any>; subscriptions: any[] } = {
		rooms: [],
		users: new Set(),
		subscriptions: [],
	};
	let counter = 0;
	for (let roomCounter = 1; roomCounter <= totalRooms; roomCounter++) {
		const newRoom = createRoom(roomCounter, usersPerRoom, prefix);
		result.rooms.push(newRoom);
		// users starts in 0
		for (let userCounter = 0; userCounter < usersPerRoom; userCounter++, counter++) {
			const uid = userId(counter, options?.userProps?.extraPrefix);
			const newUser = createUser(uid, counter, newRoom, options);

			result.users.add(newUser);
			const newSub = createSubscription(newRoom, newUser);
			result.subscriptions.push(newSub);
		}
	}
	return { ...result, users: [...result.users] };
};

const produceUsers = async (
	totalRooms: number,
	usersPerRoom: number,
	options?: {
		userProps?: {
			roles?: string[];
			extraPrefix?: string;
			[k: string]: unknown;
		};
		onlyUsers?: boolean;
	},
): Promise<{ users: Storable<User>[] }> => {
	const total = totalRooms * usersPerRoom;
	const users: Storable<User>[] = [];

	for (let userCounter = 0; userCounter < total; userCounter++) {
		const uid = userId(userCounter, options?.userProps?.extraPrefix);
		const newUser = createUser(uid, userCounter, undefined, options);

		users.push(newUser);
	}

	return { users };
};

export async function populateDatabase(options?: {
	userProps: {
		roles?: string[];
		extraPrefix?: string;
		[k: string]: unknown;
	};
	onlyUsers?: boolean;
}): Promise<
	| {
			rooms: Storable<Room>[];
			users: Storable<User>[];
			subscriptions: Storable<Subscription>[];
	  }
	| { users: Storable<User>[] }
> {
	// compile the arguments and check if the rooms already exist
	const { HOW_MANY_USERS, USERS_PER_ROOM, hash } = config;

	if (options?.onlyUsers) {
		return produceUsers(Math.ceil(HOW_MANY_USERS / parseInt(USERS_PER_ROOM)), parseInt(USERS_PER_ROOM), options);
	}

	const { rooms, users, subscriptions } = await produceRooms(
		Math.ceil(HOW_MANY_USERS / parseInt(USERS_PER_ROOM)),
		parseInt(USERS_PER_ROOM),
		hash,
		options,
	);
	return { rooms, users, subscriptions };
}

export const isOnlyUserPopulation = (
	result:
		| {
				rooms: Storable<Room>[];
				users: Storable<User>[];
				subscriptions: Storable<Subscription>[];
		  }
		| { users: Storable<User>[] },
): result is { users: Storable<User>[] } => 'users' in result && !('rooms' in result);

export const isFullPopulation = (
	result:
		| {
				rooms: Storable<Room>[];
				users: Storable<User>[];
				subscriptions: Storable<Subscription>[];
		  }
		| { users: Storable<User>[] },
): result is {
	rooms: Storable<Room>[];
	users: Storable<User>[];
	subscriptions: Storable<Subscription>[];
} => 'rooms' in result && 'users' in result && 'subscriptions' in result;
