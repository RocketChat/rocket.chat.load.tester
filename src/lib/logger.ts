const noop = () => {
	/* noop */
};

const levels = { error: 0, warn: 1, info: 2, debug: 3 } as const;

const level = levels[(process.env.LOG_LEVEL || 'error') as keyof typeof levels] ?? levels.error;

export const logger = {
	debug: level >= levels.debug ? console.debug.bind(console) : noop,
	info: level >= levels.info ? console.info.bind(console) : noop,
	warning: level >= levels.warn ? console.warn.bind(console) : noop,
	warn: level >= levels.warn ? console.warn.bind(console) : noop,
	error: level >= levels.error ? console.error.bind(console) : noop,
};
