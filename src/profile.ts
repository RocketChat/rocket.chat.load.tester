import { MongoClient } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { rand } from './lib/rand';
import { getClients } from './macros/getClients';
import { joinRooms } from './macros/joinRooms';
// import { openRooms } from './macros/openRooms';
import populate from './populate';
import { progress, snapshot } from './progress';

export default () => {
  let clients: Client[];

  const b = new (class extends BenchmarkRunner {
    async populate() {
      if (!config.DATABASE_URL) {
        return snapshot.done({
          message: 'Task skipped no DATABASE_URL',
        });
      }
      snapshot.incrementTask({
        message: 'Connecting to the database',
      });
      const client = await MongoClient.connect(config.DATABASE_URL, {
        tlsInsecure: true,
      });

      await client.connect();
      const db = client.db(config.DATABASE_NAME);

      const users = db.collection('users');

      snapshot.incrementTask({
        message: 'Checking if the hash already exists',
      });

      if (await users.findOne({ _id: new RegExp(config.hash) })) {
        snapshot.done({
          message: 'Task skipped',
        });
        return;
      }

      const results = await populate();

      snapshot.incrementTask({
        message: `Inserting users: ${results.users.length} rooms: ${results.rooms.length} subscriptions: ${results.subscriptions.length}`,
      });

      const subscriptions = db.collection('rocketchat_subscription');
      const rooms = db.collection('rocketchat_room');

      await Promise.all([
        subscriptions.insertMany(results.subscriptions),
        rooms.insertMany(results.rooms),
        users.insertMany(results.users),
      ]);
      snapshot.done({});
    }

    async setup() {
      clients = await getClients(config.HOW_MANY_USERS);
      // if (config.JOIN_ROOM) {
      await joinRooms(clients);
      // }
      // if (['yes', 'true'].includes(config.OPEN_ROOM)) {
      // await openRooms(clients);
      // }
    }
  })({
    message: config.MESSAGES_PER_SECOND,
    readMessages: config.READ_MESSAGE_PER_SECOND,
    openRoom: config.OPEN_ROOM_PER_SECOND,
    setUserStatus: config.SET_STATUS_PER_SECOND,
  });

  const Task2 = 'Sending Messages';
  b.on('ready', async () => {
    progress.addTask(Task2, { type: 'indefinite' });
  });

  let errors = 0;
  b.on('message', async () => {
    const client = rand(clients);
    const subscription = client.getSubscription();

    if (!subscription) {
      return;
    }
    try {
      await client.sendMessage(config.MESSAGE, subscription.rid);
    } catch (error) {
      progress.updateTask(Task2, {
        message: `${String(++errors)} errors`,
      });
    }
  });

  b.on('setUserStatus', () => {
    const client = rand(clients);
    client.setStatus();
  });

  b.on('readMessages', () => {
    const client = rand(clients);
    const subscription = client.getSubscription();
    if (!subscription) {
      return;
    }
    client.read(subscription.rid);
  });

  b.on('openRoom', () => {
    const client = rand(clients);
    const subscription = client.getSubscription();
    if (!subscription) {
      return;
    }
    client.openRoom(subscription.rid);
  });

  b.run();
};
