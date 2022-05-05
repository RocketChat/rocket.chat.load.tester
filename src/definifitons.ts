import { ObjectId } from 'mongodb';

export type Room = {
	_id: string;
	name: string;
	fname: string;
	t: string;
	msgs: number;
	usersCount: number;
	u: Pick<User, '_id' | 'username'>;
	customFields: unknown;
	broadcast: false;
	encrypted: false;
	ts: Date;
	ro: false;
	default: false;
	sysMes: true;
	_updatedAt: Date;
};

export type Subscription = {
	_id: string;
	rid: string;
	name: string;
	t: string;
};

export type User = {
	_id: string;
	username: string;
	createdAt: Date;
	services: {
		password: {
			bcrypt: string; // performance
		};
		resume: {
			loginTokens: [];
		};
	};
	type: 'user';
	status: string;
	active: true;
	_updatedAt: Date;
	roles: ['user'];
	lastLogin: Date;
	statusConnection: string;
	__rooms: string[];
};

type WithoutId<T> = Omit<T, '_id'>;
export type Storable<T> = WithoutId<T> & { _id: ObjectId | undefined };

export type Department = {
	name: string;
	departmentId: string;
};

export type Inquiry = {
	_id: string;
	rid: string;
	v: {
		_id: string;
	};
};

export type Visitor = {
	_id: string;
	name: string;
};
