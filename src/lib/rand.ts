export function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

export const rand = <T>(arr: T[]): T | undefined => arr[getRandomInt(arr.length)];
