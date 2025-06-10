# rocket.chat.load.tester

## Requirements

- Node v10+

## How to use

```
npm i
npm start
```

## Configurations via environment variables

Rate values are in "per day per user".

| Env var name              | Mandatory | Default value               | Description                                                                               |
| ------------------------- | --------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `HOST_URL`                | **Yes**   | `localhost:3000`            | Rocket.Chat URL                                                                           |
| `DATABASE_URL`            | **Yes**   | `mongodb://localhost:27017` | MongoDB connection string                                                                 |
| `DATABASE_NAME`           | **Yes**   | `rocketchat`                | MongoDB database name                                                                     |
| `PORT`                    | No        | `4000`                      | The port this service will listen to                                                      |
| `HOW_MANY_USERS`          | No        | `10`                        | How many simultaneous connections                                                         |
| `LOGIN_BATCH`             | No        | `5`                         | Simultaneous logins                                                                       |
| `MESSAGE_SENDING_RATE`    | No        | `100`                       | Message sending rate (100 messages per day per user)                                      |
| `SET_STATUS_RATE`         | No        | `10`                        | Set status rate                                                                           |
| `OPEN_ROOM_RATE`          | No        | `10`                        | Open room rate                                                                            |
| `READ_MESSAGE_RATE`       | No        | `10`                        | Read message rate                                                                         |
| `SUBSCRIBE_PRESENCE_RATE` | No        | `100`                       | Subscribe presence rate                                                                   |
| `INITIAL_SUBSCRIBE_RATIO` | No        | `0.02`                      | Initial subscribe ratio                                                                   |
| `INITIAL_SUBSCRIBE_MIN`   | No        | `4`                         | Initial subscribe minimum                                                                 |
| `ROOM_ID`                 | No        | `rid-__prefix__-__count__`  | Value used to generate room ids during `populate`                                         |
| `USER_ID`                 | No        | `uid-__prefix__-__count__`  | Value used to generate user ids during `populate`                                         |
| `SSL_ENABLED`             | No        | `no`                        | Rocket.Chat server has SSL or not                                                         |
| `CLIENT_TYPE`             | No        | `web`                       | Which client will be simulated (changes the APIs used). Can be: `web`, `android` or `ios` |
| `USERS_EMAIL`             | No        | `@domain.com`               | User's email domain used to register                                                      |
| `LOG_IN`                  | No        | `yes`                       | If clients should log in or just connect                                                  |
