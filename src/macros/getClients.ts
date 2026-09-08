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

	// login() is decorated with @suppressError, so a failed login resolves normally and the client is
	// still returned. Count the state machine instead of the array length, or a run that logged nobody
	// in reports full success.
	const logged = clients.filter((client) => client.status === 'logged');
	const degraded = logged.filter((client) => !client.handshakeComplete);

	console.log('Logged users total:', logged.length, 'of', users.length);

	if (degraded.length) {
		console.warn(
			`${degraded.length} user(s) logged in with an incomplete handshake and will generate less stream load`,
			'than a real client. See rc_actions_count{action="beforeLogin",status="error"}.',
		);
	}

	if (logged.length < users.length) {
		console.warn(
			`${users.length - logged.length} user(s) failed to log in. They stay in the pool and are retried when`,
			'picked; see rc_actions_count{action="login",status="error"} for the cause.',
		);

		if (logged.length === 0) {
			throw new Error(`No users logged in out of ${users.length}. Aborting: this run cannot apply any load.`);
		}
	}

	// every client is returned, including the failed ones: they stay eligible for a lazy retry in
	// getLoggedInClient. Only the reporting changes here.
	return clients;
};
