export type Room = {
  _id: string;
  name: string;
  fname: string;
  t: string;
  msgs: number;
  usersCount: number;
  u: Pick<User, '_id' | 'username'>;
  customFields: unknown;
  broadcast: false;
  encrypted: false;
  ts: Date;
  ro: false;
  default: false;
  sysMes: true;
  _updatedAt: Date;
};

export type Subscription = {
  _id: string;
  rid: string;
  name: string;
};

export type User = {
  _id: string;
  username: string;
  createdAt: Date;
  services: {
    password: {
      bcrypt: string; // performance
    };
    resume: {
      loginTokens: [];
    };
  };
  type: 'user';
  status: string;
  active: true;
  _updatedAt: Date;
  roles: ['user'];
  lastLogin: Date;
  statusConnection: string;
  __rooms: string[];
};
