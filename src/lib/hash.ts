import crypto from 'crypto';

export const hash = (data: { [k: string]: string | number }): string =>
	crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
