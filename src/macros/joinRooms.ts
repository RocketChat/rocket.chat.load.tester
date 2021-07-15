import PromisePool from '@supercharge/promise-pool';

import { Client } from '../client/Client';
import { progress, addTask } from '../progress';

const {
  LOGIN_BATCH = 10,
  // CLIENT_TYPE = 'web',
  // USERS_USERNAME = 'tester-%s',
  // USERS_PASSWORD = 'tester-%s',
  // USERS_EMAIL = 'tester-%s@domain.com',
  // HOST_URL = 'https://bench.rocket.chat',
  // MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

const join = addTask('Join rooms', progress);

export const joinRooms = async (clients: Client[]): Promise<void> => {
  await PromisePool.withConcurrency(parseInt(LOGIN_BATCH as string))
    .for(clients)
    .handleError((error) => {
      throw error;
    })
    .process(async (client: Client) => {
      try {
        await client.joinRoom();
        join.incrementTask({
          percentage: 1 / clients.length,
        });
      } catch (error) {
        console.error(error);
      }
      return client;
    });
};
