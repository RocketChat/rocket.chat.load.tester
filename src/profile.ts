import { MongoClient } from 'mongodb';

import { BenchmarkRunner } from './BenchmarkRunner';
import { Client } from './client/Client';
import { config } from './config';
import { rand } from './lib/rand';
import { getClients } from './macros/getClients';
import { joinRooms } from './macros/joinRooms';
// import { openRooms } from './macros/openRooms';
import populate from './populate';

export default () => {
  let clients: Client[];

  const b = new (class extends BenchmarkRunner {
    private skipped = false;

    async populate() {
      if (!config.DATABASE_URL) {
        console.log('Skip populate, no DATABASE_URL');
        this.skipped = true;
        return;
      }

      console.log('Start populate DB');

      const client = new MongoClient(config.DATABASE_URL);

      try {
        await client.connect();
        const db = client.db(config.DATABASE_NAME);

        const users = db.collection('users');

        console.log('Checking if the hash already exists');

        if (await users.findOne({ _id: new RegExp(config.hash) })) {
          console.log('Task skipped');
          this.skipped = true;
          return;
        }

        const results = await populate();

        console.log(`Inserting users: ${results.users.length} rooms: ${results.rooms.length} subscriptions: ${results.subscriptions.length}`);

        const subscriptions = db.collection('rocketchat_subscription');
        const rooms = db.collection('rocketchat_room');

        await Promise.all([
          subscriptions.insertMany(results.subscriptions),
          rooms.insertMany(results.rooms),
          users.insertMany(results.users),
        ]);

        console.log('Done populating DB');
      } finally {
        await client.close();
      }
    }

    async setup() {
      // if it didn't have to populate there is not need to join rooms, so skip
      if (this.skipped) {
        return;
      }

      const clients = await getClients(config.HOW_MANY_USERS);
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

  b.on('ready', async () => {
    console.log('Starting sending messages');
  });

  b.on('message', async () => {
    const client = rand(clients);
    const subscription = client.getSubscription();

    if (!subscription) {
      return;
    }
    try {
      await client.sendMessage(config.MESSAGE, subscription.rid);
    } catch (error) {
      console.error('Error sending message', error);
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
