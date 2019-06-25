import redis from 'redis';

const {
	LOGIN_OFFSET,
	RESET_OFFSET,
	SEATS_PER_ROOM,
	RESET_SEATS,
	REDIS_HOST,
	REDIS_PORT,
} = process.env;

const REDIS_OFFSET_KEY = 'load-test-offset';
const REDIS_ROOM_KEY = 'load-test-room';

let redisClient;
export const initOffset = async () => {
	redisClient = redis.createClient({
		host: REDIS_HOST || '127.0.0.1',
		port: REDIS_PORT || '6379',
	});

	if (RESET_OFFSET) {
		redisSet(REDIS_OFFSET_KEY, parseInt(RESET_OFFSET) || 0);
	}

	if (RESET_SEATS) {
		redisSet(REDIS_ROOM_KEY, parseInt(RESET_SEATS) || 0);
	}
};

const redisGet = async (key) => {
	return new Promise((resolve, reject) => {
		redisClient.get(key, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(result);
		})
	});
};

const redisSet = async (key, value) => {
	return new Promise((resolve, reject) => {
		redisClient.set(key, value, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(result);
		})
	});
};

const redisInc = async (key) => {
	return new Promise((resolve, reject) => {
		redisClient.incr(key, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(parseInt(result));
		})
	});
};

export const getCurrentOffset = async () => {
	const offset = await redisGet(REDIS_OFFSET_KEY);

	return offset || 0;
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

			resolve(parseInt(current));
		});
	});
};

export const getRoomId = async (roomId) => {
	if (typeof SEATS_PER_ROOM === 'undefined') {
		return roomId;
	}

	const current = await redisInc(REDIS_ROOM_KEY) - 1;

	return roomId.replace(/\%s/, parseInt(current / parseInt(SEATS_PER_ROOM)));
};
