import redis from 'redis';

const {
	LOGIN_OFFSET,
} = process.env;

const REDIS_OFFSET_KEY = 'load-test-offset';

let redisClient;
export const initOffset = async () => {
	redisClient = redis.createClient({
		host: process.env.REDIS_HOST || '127.0.0.1',
		port: process.env.REDIS_PORT || '6379',
	});

	if (process.env.RESET_OFFSET) {
		return new Promise((resolve, reject) => {
			redisClient.set(REDIS_OFFSET_KEY, 0, (err) => {
				if (err) {
					return reject(err);
				}
				resolve();
			})
		});
	}
};

export const getCurrentOffset = async () => {
	return new Promise((resolve, reject) => {
		redisClient.get(REDIS_OFFSET_KEY, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(result || 0);
		})
	});
}

export const getLoginOffset = async (howMany) => {
	if (typeof LOGIN_OFFSET !== 'undefined') {
		return parseInt(LOGIN_OFFSET);
	}

	return new Promise(async (resolve, reject) => {
		const current = await getCurrentOffset();
		redisClient.incrby(REDIS_OFFSET_KEY, howMany, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(current);
		})
	});
};
