declare module '@koa/router';

// Typed version of Object.keys
declare interface ObjectConstructor {
	keys<T>(o: T): import('../src/definifitons').ObjectKeys<T>;
}
