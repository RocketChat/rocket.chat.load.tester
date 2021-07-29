import PromisePool from '@supercharge/promise-pool';

import { Client } from '../client/Client';

const {
  LOGIN_BATCH = 10,
  // CLIENT_TYPE = 'web',
  // USERS_USERNAME = 'tester-%s',
  // USERS_PASSWORD = 'tester-%s',
  // USERS_EMAIL = 'tester-%s@domain.com',
  // HOST_URL = 'https://bench.rocket.chat',
  // MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

export const joinRooms = async (clients: Client[]): Promise<void> => {
  const total = clients.length;

  console.log('Joining rooms for', total, 'clients');

  await PromisePool.withConcurrency(parseInt(LOGIN_BATCH as string))
    .for(clients)
    .handleError((error) => {
      throw error;
    })
    .process(async (client: Client) => {
      try {
        await client.joinRoom();
      } catch (error) {
        console.error(error);
      }
      return client;
    });
};
