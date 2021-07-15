import PromisePool from '@supercharge/promise-pool';

import { Client } from '../client/Client';
import { progress } from '../progress';

const {
  LOGIN_BATCH = 10,
  // CLIENT_TYPE = 'web',
  // USERS_USERNAME = 'tester-%s',
  OPEN_ROOM = 'true',
  // USERS_PASSWORD = 'tester-%s',
  // USERS_EMAIL = 'tester-%s@domain.com',
  // HOST_URL = 'https://bench.rocket.chat',
  // MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

if (['yes', 'true'].includes(OPEN_ROOM)) {
  progress.addTask('Open rooms', {
    type: 'percentage',
  });
}

export const openRooms = async (clients: Client[]): Promise<void> => {
  await PromisePool.withConcurrency(parseInt(LOGIN_BATCH as string))
    .for(clients)
    .handleError((error) => {
      throw error;
    })
    .process(async (client: Client) => {
      try {
        await client.openRoom();
        progress.incrementTask('Open rooms', {
          percentage: 1 / clients.length,
        });
      } catch (error) {
        console.error(error);
      }
      return client;
    });
};
