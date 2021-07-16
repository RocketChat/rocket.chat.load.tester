import { config } from './config';
import { Room, User } from './definifitons';
import { roomId, subscriptionId, username, email, userId } from './lib/ids';

const today = new Date();

const userBase = {
  createdAt: today,
  services: {
    password: {
      bcrypt: '$2b$10$gPTtjX0DUHOPYfYyIeGMauXu3/AqnrqVZ/GnfOMUzy1U6AE4PIiQi', // performance
    },
    resume: {
      loginTokens: [],
    },
  },
  type: 'user',
  status: 'offline',
  active: true,
  _updatedAt: today,
  roles: ['user'],
  lastLogin: today,
  statusConnection: 'offline',
  __rooms: [],
};

const cache: { [k: string]: User } = {};

function createUser(uid: string, count: number, room: Room) {
  if (cache[uid]) {
    return cache[uid];
  }
  const user = JSON.parse(JSON.stringify(userBase));
  user._id = uid;
  user.username = username(count);
  user.name = `Test User No ${uid}`;
  if (user.emails) {
    user.emails[0].address = email(count);
  }
  user.__rooms.push(room._id);
  cache[uid] = user;
  return user;
}

function createRoom(i: number, usersPerRoom: number, prefix: string): Room {
  return {
    _id: roomId(i),
    name: `${prefix}-${i}`,
    fname: `${prefix}-${i}`,
    t: 'p',
    msgs: 0,
    usersCount: usersPerRoom,
    u: {
      _id: '',
      username: '',
    },
    customFields: {},
    broadcast: false,
    encrypted: false,
    ts: today,
    ro: false,
    default: false,
    sysMes: true,
    _updatedAt: today,
  };
}

function createSubscription(room: Room, { _id, username }: User) {
  return {
    _id: subscriptionId(room, { _id }),
    rid: room._id,
    name: room.name,
    fname: room.fname,
    open: true,
    alert: false,
    unread: 0,
    userMentions: 0,
    groupMentions: 0,
    ts: today,
    t: 'p',
    u: { _id, username },
    _updatedAt: today,
    ls: today,
  };
}

const produceRooms = async (
  totalRooms: number,
  usersPerRoom: number,
  prefix: string
): Promise<{ rooms: any[]; users: any[]; subscriptions: any[] }> => {
  const result: { rooms: any[]; users: Set<any>; subscriptions: any[] } = {
    rooms: [],
    users: new Set(),
    subscriptions: [],
  };
  let counter = 0;
  for (let roomCounter = 1; roomCounter <= totalRooms; roomCounter++) {
    const newRoom = createRoom(roomCounter, usersPerRoom, prefix);
    result.rooms.push(newRoom);
    // users starts in 0
    for (
      let userCounter = 0;
      userCounter < usersPerRoom;
      userCounter++, counter++
    ) {
      const uid = userId(counter);
      const newUser = createUser(uid, counter, newRoom);

      result.users.add(newUser);
      const newSub = createSubscription(newRoom, newUser);
      result.subscriptions.push(newSub);
    }
  }
  return { ...result, users: [...result.users] };
};

export default async () => {
  // compile the arguments and check if the rooms already exist
  const { HOW_MANY_USERS, USERS_PER_ROOM, hash } = config;

  const { rooms, users, subscriptions } = await produceRooms(
    Math.ceil(HOW_MANY_USERS / parseInt(USERS_PER_ROOM)),
    parseInt(USERS_PER_ROOM),
    hash
  );
  return { rooms, users, subscriptions };
};
