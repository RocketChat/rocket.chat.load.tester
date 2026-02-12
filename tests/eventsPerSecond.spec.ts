import { eventsPerSecond } from '../src/BenchmarkRunner';

/**
 * given a number of users and the rate of events per second
 * it should return the delay in ms, that is the time between
 * two consecutive events
 */

it('should return the delay in ms', () => {
	// 1 user, 1 event per second, 1000 ms delay between events
	expect(eventsPerSecond(1)).toBe(1000);

	// 2 users, 1 event per second, 500 ms delay between events
	expect(eventsPerSecond(2)).toBe(500);
});
