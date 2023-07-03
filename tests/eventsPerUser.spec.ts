import { eventsPerUser } from '../src/BenchmarkRunner';

/**
 * given a number of users and the rate of events per second
 * it should return the delay in ms, that is the time between
 * two consecutive events
 */

it('should return the delay in ms', () => {
	// 1 user, 1 event per second, 1000 ms delay between events
	expect(eventsPerUser(1, 1)).toBe(1000);
	// 2 users, 1 event per second, 500 ms delay between events
	expect(eventsPerUser(1, 2)).toBe(500);
	// 4 users, 2 events per second, 125 ms delay between events
	expect(eventsPerUser(2, 4)).toBe(125);

	expect(eventsPerUser(1, 0)).toBe(Infinity);

	expect(eventsPerUser(0.5, 1)).toBe(2000);
});
