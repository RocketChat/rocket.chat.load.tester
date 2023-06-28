const queue: (() => Promise<unknown>)[] = [];

export async function consumeQueue(batchSize = 2) {
	console.log('consume queue');

	const ts = queue.splice(0, batchSize);
	if (ts.length > 0) {
		console.log('got from queue', ts.length);

		await Promise.all(ts.map((t) => t()));
	}

	setTimeout(() => consumeQueue(batchSize), 1000);
}

export function queueTask(task: () => Promise<unknown>) {
	console.log('queue task');
	return new Promise((resolve) => {
		queue.push(async () => {
			await task();
			resolve(true);
		});
	});
}
