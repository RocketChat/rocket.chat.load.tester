export class AlreadyLoggingError extends Error {
	constructor() {
		super('Already logging');
	}
}
