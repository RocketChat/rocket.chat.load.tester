# rocket.chat.load.tester

## Requirements

* Node v10+

## How to use

```
npm i
npm start
```

## Configurations via environment variables

Env var name | Default value | Description
------------ | ------------- | -------------
`HOST_URL` | `localhost:3000` | Rocket.Chat URL
`PORT` | `3000` | The port this service will listen to
`TRY_REGISTER` | `yes` | Register user if login fails
`HOW_MANY_USERS` | `10` | How many simultaneous connections
`LOGIN_BATCH` | `5` | Simultaneous logins
`MESSAGE_SENDING_RATE` | `0.002857142857143` | Message sending rate
`ROOM_ID` | `rid-__prefix__-__count__` | Value used to generate room ids during `populate`
`OPEN_ROOM` | `yes` | (Deprecated) Open rooms and listen for messages
`SSL_ENABLED` | `no` | Rocket.Chat server has SSL or not
`LOGIN_OFFSET` | `1` | (Deprecated) Initial user number
`INITIAL_LOGIN_OFFSET` | `1` | (Deprecated) Initial user number
`SEND_MESSAGES` | `yes` | (Deprecated) If connected clients should send messages or not
`CLIENT_TYPE` | `web` | Which client will be simulated (changes the APIs used). Can be: `web`, `android` or `ios`
`USERS_USERNAME` | `tester-%s` | (Deprecated) Username pattern
`USERS_PASSWORD` | `tester-%s` | (Deprecated, password is always `performance`) Password used to login/register users
`USERS_EMAIL` | `@domain.com` | User's email domain used to register
`JOIN_ROOM` | `null` | (Deprecated) Room _id that users will join
`LOG_IN` | `yes` | If clients should log in or just connect
