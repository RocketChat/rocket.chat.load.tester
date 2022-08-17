import { config } from '../config';
import { Room, User } from '../definifitons';

export const subscriptionId = (room: Room, user: Pick<User, '_id'>): string =>
	config.SUBSCRIPTION_ID.replace('__rid__', room._id).replace(
		'__uid__',
		user._id
	);

export const roomId = (counter: number): string =>
	config.ROOM_ID.replace('__prefix__', config.hash).replace(
		'__count__',
		String(counter)
	);
export const userId = (counter: number, extraPrefix = ''): string =>
	config.USER_ID.replace(
		'__prefix__',
		`${config.hash}${extraPrefix || ''}`
	).replace('__count__', String(counter));

export const username = (counter: number, extraPrefix = ''): string =>
	`user.${userId(counter, extraPrefix)}`;

export const email = (counter: number, extraPrefix = ''): string =>
	username(counter, extraPrefix) + config.USERS_EMAIL;
