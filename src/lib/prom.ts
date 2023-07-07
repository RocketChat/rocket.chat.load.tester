import client from 'prom-client';

client.collectDefaultMetrics({
	prefix: 'load_tester',
});

// TODO: add label with instance

export const connected = new client.Gauge({
	name: 'rc_load_connected',
	help: 'Connected clients',
});
export const login = new client.Summary({
	name: 'rc_load_login',
	help: 'Users logged in',
	labelNames: ['status'],
});
export const register = new client.Summary({
	name: 'rc_load_register',
	help: 'User registered',
	labelNames: ['status'],
});
export const messages = new client.Summary({
	name: 'rc_load_messages',
	help: 'Messages sent',
	labelNames: ['status'],
});
export const roomJoin = new client.Summary({
	name: 'rc_load_room_join',
	help: 'Room join event',
	labelNames: ['status'],
});
export const roomSubscribe = new client.Summary({
	name: 'rc_load_room_subscribe',
	help: 'Room subscribe event',
	labelNames: ['status'],
});
export const openRoom = new client.Summary({
	name: 'rc_load_open_room',
	help: 'Open room sction',
	labelNames: ['status'],
});

export const actions = new client.Summary({
	name: 'rc_actions',
	help: 'All performed actions',
	labelNames: ['action', 'status'],
});

export const rest = new client.Summary({
	name: 'rc_rest_time',
	help: 'All performed rest actions',
	labelNames: ['endpoint', 'status', 'method'],
});

export const subscriptions = new client.Summary({
	name: 'rc_load_subscriptions',
	help: 'Subscriptions',
	labelNames: ['name', 'status'],
});

export const roleAdd = new client.Summary({
	name: 'rc_load_role_add',
	help: 'Role added',
	labelNames: ['status'],
});

export const inquiryTaken = new client.Summary({
	name: 'rc_load_inquiry_taken',
	help: 'Inquiry taken',
	labelNames: ['status'],
});

export default client;

export { client };

export const promWrapperRest = <F extends (endpoint: string, ...args: any[]) => Promise<any>>(method: string, fn: F): F => {
	return (async (url: string, ...args: any[]) => {
		const [endpoint] = url.split('?');

		const endTimer = rest.startTimer({ endpoint, method });
		try {
			const result = await fn(endpoint, ...args);
			endTimer({ status: 'success' });
			return result;
		} catch (e) {
			endTimer({ status: 'error' });
			throw e;
		}
	}) as unknown as F;
};

export const promWrapperSubscribe = <F extends (...args: any[]) => Promise<any>>(fn: F): F => {
	return (async (...args: any[]) => {
		const endTimer = subscriptions.startTimer({ name: args[0] });
		try {
			const result = await fn(...args);
			endTimer({ status: 'success' });
			return result;
		} catch (e) {
			endTimer({ status: 'error' });
			throw e;
		}
	}) as unknown as F;
};
