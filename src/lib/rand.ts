export const rand = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
