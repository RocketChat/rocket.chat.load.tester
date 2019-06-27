import redis from 'redis';

import {
	events,
	EVENT_RATE_CHANGE,
} from './events';

const {
	RESET_OFFSET,
	RESET_SEATS,
	REDIS_HOST,
	REDIS_PORT,
} = process.env;

export const REDIS_OFFSET_KEY = 'load-test-offset';
export const REDIS_ROOM_KEY = 'load-test-room';

const REDIS_MSG_RATE = 'load-msg-rate';

let redisClient;
let redisSub;
export const redisInit = async () => {
	redisClient = redis.createClient({
		host: REDIS_HOST || '127.0.0.1',
		port: REDIS_PORT || '6379',
	});

	redisSub = redis.createClient({
		host: REDIS_HOST || '127.0.0.1',
		port: REDIS_PORT || '6379',
	});

	if (RESET_OFFSET) {
		redisSet(REDIS_OFFSET_KEY, parseInt(RESET_OFFSET) || 0);
	}

	if (RESET_SEATS) {
		redisSet(REDIS_ROOM_KEY, parseInt(RESET_SEATS) || 0);
	}

	redisSub.on('message', (channel, message) => {
		if (channel === REDIS_MSG_RATE) {
			events.emit(EVENT_RATE_CHANGE, parseFloat(message));
		}
	});

	redisSub.subscribe(REDIS_MSG_RATE);
};

export const redisGet = async (key) => {
	return new Promise((resolve, reject) => {
		redisClient.get(key, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(result);
		})
	});
};

export const redisSet = async (key, value) => {
	return new Promise((resolve, reject) => {
		redisClient.set(key, value, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(result);
		})
	});
};

export const redisInc = async (key) => {
	return new Promise((resolve, reject) => {
		redisClient.incr(key, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(parseInt(result));
		})
	});
};

export const redisIncBy = async (key, by) => {
	return new Promise((resolve, reject) => {
		redisClient.incrby(key, by, (err, result) => {
			if (err) {
				return reject(err);
			}

			resolve(parseInt(result));
		})
	});
};

