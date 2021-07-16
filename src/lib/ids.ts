import { config } from '../config';
import { Room, User } from '../definifitons';

export const subscriptionId = (room: Room, user: Pick<User, '_id'>): string =>
  config.SUBSCRIPTION_ID.replace('__rid__', room._id).replace(
    '__uid__',
    user._id
  );

export const roomId = (counter: number): string =>
  config.ROOM_ID.replace('__prefix__', config.hash).replace(
    '__count__',
    String(counter)
  );
export const userId = (counter: number): string =>
  config.USER_ID.replace('__prefix__', config.hash).replace(
    '__count__',
    String(counter)
  );

export const username = (counter: number): string => `user.${userId(counter)}`;

export const email = (counter: number): string =>
  username(counter) + config.USERS_EMAIL;
