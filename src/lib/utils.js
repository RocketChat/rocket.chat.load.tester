import {
	redisGet,
	redisIncBy,
	REDIS_ROOM_KEY,
	REDIS_OFFSET_KEY,
} from './redis';

const {
	LOGIN_OFFSET,
	SEATS_PER_ROOM,
	ROOM_ID = 'GENERAL',
} = process.env;

export const getCurrentOffset = async () => {
	return (await redisGet(REDIS_OFFSET_KEY)) || 0;
}

export const getLoginOffset = async (howMany) => {
	if (typeof LOGIN_OFFSET !== 'undefined') {
		return parseInt(LOGIN_OFFSET);
	}

	return (await redisIncBy(REDIS_OFFSET_KEY, howMany)) - howMany;
};

export const getRoomOffset = async (howMany) => {
	return (await redisIncBy(REDIS_ROOM_KEY, howMany)) - howMany;
};

export const getRoomId = (current) => {
	if (typeof SEATS_PER_ROOM === 'undefined') {
		return ROOM_ID;
	}

	return ROOM_ID.replace(/\%s/, parseInt(current / parseInt(SEATS_PER_ROOM)));
};
