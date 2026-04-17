export const suppressError = <F extends (...args: any) => Promise<any>>(fn: F): F => {
	return (async (...args: any) => {
		try {
			return await fn(...args);
		} catch (error) {
			console.error(error);
		}
	}) as F;
};
