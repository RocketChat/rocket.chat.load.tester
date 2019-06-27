import {
	redisGet,
	redisSet,
	redisInc,
	redisIncBy,
	REDIS_ROOM_KEY,
	REDIS_OFFSET_KEY,
} from './redis';

const {
	LOGIN_OFFSET,
	INITIAL_LOGIN_OFFSET,
	SEATS_PER_ROOM,
} = process.env;

export const getCurrentOffset = async () => {
	const offset = await redisGet(REDIS_OFFSET_KEY);

	if (!offset && INITIAL_LOGIN_OFFSET) {
		await redisSet(REDIS_OFFSET_KEY, parseInt(INITIAL_LOGIN_OFFSET));
		return parseInt(INITIAL_LOGIN_OFFSET);
	}

	return offset || 0;
}

export const getLoginOffset = async (howMany) => {
	if (typeof LOGIN_OFFSET !== 'undefined') {
		return parseInt(LOGIN_OFFSET);
	}

	const current = await getCurrentOffset();

	await redisIncBy(REDIS_OFFSET_KEY, howMany);

	return parseInt(current);
};

export const getRoomId = async (roomId) => {
	if (typeof SEATS_PER_ROOM === 'undefined') {
		return roomId;
	}

	const current = await redisInc(REDIS_ROOM_KEY) - 1;

	return roomId.replace(/\%s/, parseInt(current / parseInt(SEATS_PER_ROOM)));
};
