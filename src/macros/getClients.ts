import PromisePool from '@supercharge/promise-pool';

import type { Client } from '../client/Client';
import { config } from '../config';

const {
	CLIENT_TYPE = 'web',
	// USERS_USERNAME = 'tester-%s',
	// USERS_PASSWORD = 'tester-%s',
	// USERS_EMAIL = 'tester-%s@domain.com',
	HOST_URL = 'http://localhost:3000',
	// MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

// eslint-disable-next-line @typescript-eslint/naming-convention
interface ConstructorOf<T> {
	new (...args: any[]): T;
}

export const getClients = async <C extends Client, T extends ConstructorOf<C>>(
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Kind: T,
	size: number,
	userPrefix = '',
	usersCurrent?: number[],
): Promise<C[]> => {
	const users = Array.isArray(usersCurrent) ? usersCurrent : Array.from({ length: size }).map((_, i) => i);

	console.log('Logging in', size, 'users');

	if (config.DYNAMIC_LOGIN) {
		console.log('Creating a total of dynamic clients:', users.length);

		return users.map((index) => new Kind(HOST_URL, CLIENT_TYPE as 'web' | 'android' | 'ios', index as number, userPrefix));
	}

	const { results } = await PromisePool.withConcurrency(config.LOGIN_BATCH)
		.for(users)
		.handleError((error) => {
			console.error('Error during log in', error);
			// throw error;
		})
		.process(async (index) => {
			const client = new Kind(HOST_URL, CLIENT_TYPE as 'web' | 'android' | 'ios', index as number, userPrefix);

			await client.login();

			return client;
		});

	const clients = results.filter(Boolean);

	console.log('Logged users total:', clients.length);

	return clients;
};
