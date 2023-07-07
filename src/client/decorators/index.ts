import { actions } from '../../lib/prom';

export function action(_target: unknown, action: string, descriptor: PropertyDescriptor) {
	const childFunction = descriptor.value;

	descriptor.value = async function (...args: any[]) {
		const endTimer = actions.startTimer({ action });
		try {
			const result = await childFunction.apply(this, args);
			endTimer({ status: 'success' });
			return result;
		} catch (e) {
			endTimer({ status: 'error' });
			throw e;
		}
	};
	return descriptor;
}

export function errorLogger(_target: unknown, action: string, descriptor: PropertyDescriptor) {
	const childFunction = descriptor.value;

	descriptor.value = async function (...args: any[]) {
		try {
			return await childFunction.apply(this, args);
		} catch (e) {
			console.error(`error in ${action}`, e);
			throw e;
		}
	};
	return descriptor;
}

export function suppressError(_target: unknown, action: string, descriptor: PropertyDescriptor) {
	const childFunction = descriptor.value;

	descriptor.value = async function (...args: any[]) {
		try {
			return await childFunction.apply(this, args);
		} catch (e) {
			console.error(`error in ${action}`, e);
		}
	};
	return descriptor;
}
