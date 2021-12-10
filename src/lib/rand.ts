export function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

export const rand = <T>(arr: T[]): T => arr[getRandomInt(arr.length)];
