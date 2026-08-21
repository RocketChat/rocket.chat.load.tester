# Load Tester Runbook

Operational guide for running rocket.chat.load.tester against a Rocket.Chat workspace. Verified against Rocket.Chat 8.x, which validates REST query parameters strictly.

## What it does

The tester simulates web clients. Each simulated user logs in over REST and DDP, subscribes to the same notification streams as the real web client, and then continuously performs a mix of actions: sending messages, opening rooms, reading messages, setting status, and subscribing to user presence. Prometheus metrics are exposed on port 4000.

## Requirements

- Node.js 20 (see `engines` in package.json)
- Network access to the target Rocket.Chat instance
- Direct MongoDB access to the target database. The tester seeds test users, rooms, and subscriptions by inserting documents directly into MongoDB. Without `DATABASE_URL` the populate step is skipped and the configured users must already exist (password `performance`).

## Prepare the Rocket.Chat instance

1. Disable the REST rate limiter for the duration of the test. The default limit of 10 requests per minute per route per IP will return 429 to any meaningful load. Admin area, General, REST API, or via REST:

```bash
curl -sk -X POST -H "X-User-Id: $ADMIN_ID" -H "X-Auth-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"value":false}' \
  "$SITE_URL/api/v1/settings/API_Enable_Rate_Limiter"
```

2. Disable the DDP rate limiter as well. This is a separate group of settings from the REST limiter above, and it throttles Meteor method calls, including the ones this tester issues over REST.

   It bites hardest during the login phase, and mostly because of how the tester works rather than a limit real users hit. The tester calls `public-settings/get` anonymously over REST (`method.callAnon`), and for anonymous calls the server has no identity to bucket by, so it buckets by client IP. Every simulated client on one load generator therefore shares a single bucket, and a rule matching all non-stream methods applies `DDP_Rate_Limit_Connection_By_Method`, 10 requests per 10 seconds by default. A 50 user login burst from one host gets most of those calls rejected with `too-many-requests`. A real browser makes the same call over its own DDP connection, so each user gets their own bucket and never sees this.

   The tester suppresses these errors, so the run still reports every user as logged in while a large share of them silently skipped the settings fetch. Watch for `error in beforeLogin` in the output, and for a `beforeLogin` error series on the dashboard.

   Turn off `DDP_Rate_Limit_IP_Enabled`, `DDP_Rate_Limit_User_Enabled`, `DDP_Rate_Limit_Connection_Enabled`, `DDP_Rate_Limit_User_By_Method_Enabled` and `DDP_Rate_Limit_Connection_By_Method_Enabled`, or raise their allowances well above the expected burst:

```bash
for s in DDP_Rate_Limit_IP_Enabled DDP_Rate_Limit_User_Enabled DDP_Rate_Limit_Connection_Enabled \
         DDP_Rate_Limit_User_By_Method_Enabled DDP_Rate_Limit_Connection_By_Method_Enabled; do
  curl -sk -X POST -H "X-User-Id: $ADMIN_ID" -H "X-Auth-Token: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"value":false}' "$SITE_URL/api/v1/settings/$s"
done
```

3. Community Edition only: presence broadcast disables itself automatically above 200 concurrent connections. Presence results will be empty beyond that point. Enterprise licenses are not affected.

4. Re-enable both rate limiters when the test is finished.

## Rate settings: read this first

All `*_RATE` variables are events per user per DAY, not per second. The tester converts them at startup:

```
events per second (total) = HOW_MANY_USERS * RATE / 86400
```

Worked example: `HOW_MANY_USERS=500` with `MESSAGE_SENDING_RATE=100` means each user sends 100 messages per day, so the whole fleet sends 500 * 100 / 86400, which is about 0.58 messages per second.

The tester prints the computed totals at startup. Always check that block before trusting a run:

```
Rate settings are events per user per DAY. Computed totals for HOW_MANY_USERS=10:
  MESSAGE_SENDING_RATE=8640 per user per day equals 1.000000 events per second in total
  ...
```

Do not multiply the rates by 86400. If the computed totals print hundreds of events per second, the input rates are wrong.

## Configuration reference

| Variable | Default | Meaning |
| --- | --- | --- |
| `HOST_URL` | `http://localhost:3000` | Target Rocket.Chat URL |
| `SSL_ENABLED` | `no` | Set `yes` for https targets |
| `HOW_MANY_USERS` | `10` | Simulated users |
| `USERS_PER_ROOM` | `10` | Users per seeded room; rooms created = HOW_MANY_USERS / USERS_PER_ROOM |
| `LOGIN_BATCH` | `5` | Concurrent logins during ramp-up |
| `DATABASE_URL` | `mongodb://localhost:27017` | MongoDB connection string for populate; append `?directConnection=true` when connecting to a single replica set member |
| `DATABASE_NAME` | `rocketchat` | Database name |
| `TASK_ID` | host IP | Stable prefix for generated ids; set explicitly for reproducible runs |
| `MESSAGE_SENDING_RATE` | `100` | Messages per user per day |
| `OPEN_ROOM_RATE` | `10` | Room opens per user per day |
| `READ_MESSAGE_RATE` | `10` | Read receipts per user per day |
| `SET_STATUS_RATE` | `10` | Status changes per user per day |
| `SUBSCRIBE_PRESENCE_RATE` | `100` | Presence subscription changes per user per day |
| `IGNORE_ROOMS` | `GENERAL` | Comma separated room ids/names excluded from actions |

## Run

```bash
npm install

export HOST_URL=http://localhost:3000 SSL_ENABLED=no \
  DATABASE_URL='mongodb://localhost:27017/?directConnection=true' DATABASE_NAME=rocketchat \
  TASK_ID=mytest HOW_MANY_USERS=10 USERS_PER_ROOM=10 LOGIN_BATCH=5 \
  MESSAGE_SENDING_RATE=8640 OPEN_ROOM_RATE=8640 READ_MESSAGE_RATE=8640 \
  SET_STATUS_RATE=8640 SUBSCRIBE_PRESENCE_RATE=17280

npm start
```

The example rates above give 1 event per second per action at 10 users (8640 per user per day equals 0.1 per second per user). They are smoke test values, far above realistic per user activity.

A healthy startup looks like:

```
Rate settings are events per user per DAY. Computed totals for HOW_MANY_USERS=10:
  ...
Start populate DB
Inserting users: 10 rooms: 1 subscriptions: 10
Done populating DB
Logging in 10 users
Logged users total: 10
Starting sending messages
```

`Logged users total` must equal `HOW_MANY_USERS`. Stop the run with Ctrl+C.

## Metrics and dashboards

The tester exposes Prometheus metrics on port 4000 at `/metrics`: connected clients, per action counters with success and error labels, and action duration histograms.

`docker-compose.yml` runs the full graphed setup: the tester, Prometheus (scraping the tester every 15 seconds), and Grafana with the bundled dashboard auto provisioned. The dashboard "Load Tester - Actions" has four panels:

| Panel | Shows | Timeframe |
| --- | --- | --- |
| Connected clients and logins | Open DDP connections, plus login successes and failures | Connections are a live value; login series are running totals since the run started |
| Action rate (actions per second) | Actions completed per second, per action type | Averaged over a trailing 5 minute window |
| Actions completed (cumulative since run start) | Total actions per action type, success and error series | Cumulative, resets if the tester restarts |
| Action duration (mean, trailing 5 minutes) | Mean time for one action to complete, per action type | Averaged over a trailing 5 minute window |
| Action duration p99 | Tail latency per action type | Cumulative since the tester started, see the caveat below |
| REST errors by endpoint | Failed REST calls per second, per endpoint | Averaged over a trailing 5 minute window |
| REST latency by endpoint | Mean round trip time per endpoint | Averaged over a trailing 5 minute window |
| Stream subscriptions | DDP subscribe duration, and subscribe failures on the right axis | Averaged over a trailing 5 minute window |

A collapsed "Load generator health" row at the bottom holds four more panels, for deciding whether a slowdown is the workspace or the tester itself: event loop lag, CPU cores, memory, and how many loader instances Prometheus is scraping.

The dashboard opens with a "How to read this dashboard" panel that states all of this on screen, so nothing has to be hovered over. Collapse that row once the panels are familiar, which leaves the graphs in place. Each panel also carries its own explanation in its Grafana description, on the info icon in the panel corner.

How to read them:

- Compare **Action rate** against the events per second the tester prints at startup. Series sitting below their configured rate mean the workspace is not keeping up.
- Rising **Action duration** together with a falling action rate is the signature of a saturating workspace.
- **REST errors by endpoint** is the first place to look when anything seems wrong, and empty is the healthy state. Because the tester suppresses most action errors and still reports users as logged in, this panel is often the only place a rejected or throttled request is visible. It cannot distinguish a 429 from a 400 or a 500, so read the tester output for the status code.
- **Open the Load generator health row before blaming the workspace.** Event loop lag above roughly 50 milliseconds, or CPU approaching 1.0 core, means the tester is saturated and can no longer issue actions on schedule, at which point the latency on the other panels stops measuring Rocket.Chat. Add loader instances instead of raising rates.
- **Actions completed** is the second error check. Any error series that climbs means failures are accumulating.
- **Action duration p99** exposes the tail, but the tester publishes summary quantiles with no sliding window, so those values are cumulative since it started and will lag during a long run. Use it as a rough indicator and trust the mean panel for current behaviour.
- Action counts are not server request counts. One openRoom action drives several requests and also triggers a read, while a presence action with nothing new to subscribe to sends no request at all.
- `sendMessage` includes a deliberate one second typing pause, so a mean duration near one second is by design and is not server latency. Watch its trend rather than its absolute value.
- Durations are measured client side, so they include network and reverse proxy time, not only Rocket.Chat.

```bash
export HOST_URL=http://host.docker.internal:3000 SSL_ENABLED=no \
  DATABASE_URL='mongodb://host.docker.internal:27017/?directConnection=true' \
  DATABASE_NAME=rocketchat HOW_MANY_USERS=10 MESSAGE_SENDING_RATE=8640

docker compose up -d --build
```

Open Grafana at `http://localhost:3300` (admin / foobar). The Prometheus datasource and the dashboard are provisioned automatically; no manual import is needed. Prometheus itself is at `http://localhost:9090` for ad hoc queries.

If the default ports clash with other services, override them: `GRAFANA_PORT=3301 PROMETHEUS_PORT=9091 docker compose up -d`.

When running the tester outside Docker (`npm start`), point any existing Prometheus at `localhost:4000` and import `Load Tester - Dashboard.json` into Grafana manually.

### Running more than one loader

One tester process is single threaded and becomes the bottleneck long before a real workspace does, so larger tests use several loader instances:

```bash
docker compose up -d --scale load-scale=3
```

Two things to know before doing that, both verified on this setup:

**All replicas share one identity set unless you change `TASK_ID`.** The user, room and subscription ids are derived from a hash of the configuration, and `TASK_ID` is part of that hash. Because Compose gives every replica the same environment, three replicas with the same `TASK_ID` compute the same hash: the first one populates the users and the other two log in as those same accounts. Three replicas at `HOW_MANY_USERS=20` therefore produce 60 sessions spread over 20 accounts, not 60 distinct users. For genuinely distinct users, run each loader as its own Compose project with a different `TASK_ID`, for example:

```bash
for i in 1 2 3; do
  TASK_ID=loader-$i docker compose -p loader$i up -d load-scale
done
```

Leaving `TASK_ID` empty is another option: the tester then falls back to the container's own IP address, which is unique per replica. That gives distinct users per loader, at the cost of a fresh user set on every run as container addresses change.

**Prometheus discovers loaders by DNS.** The scrape job uses `dns_sd_configs` against the `load-scale` service name so that every replica is found. A single static target would only ever scrape whichever container DNS answered with, leaving the other loaders invisible while the dashboard reported a fraction of the real load. Check the "Loader instances reporting" panel at the start of every scaled run: it must equal the number of loaders you started. Instances appear there as container IP addresses rather than names, which is a limitation of DNS discovery.

Remember to pass the same `PROMETHEUS_PORT` and `GRAFANA_PORT` overrides on every `docker compose` command in a session. Omitting them on a later command makes Compose try to recreate those containers on the default ports and fail if something else holds them.

## Verify a run

Check the server side, not just the tester output. The tester suppresses most action errors by design, so a run can look quiet while every request fails.

- Watch for non-200 responses at the reverse proxy or in Rocket.Chat logs. A correct run produces zero 4xx and 5xx responses.
- `users.presence` requests must look like `GET /api/v1/users.presence?ids=<id1>,<id2>` with a 200 response. Requests are chunked at 100 ids, which keeps the URL under the default request line limits of nginx (8KB) and Node (16KB).
- Messages should appear in the seeded rooms (`<hash>-1`, `<hash>-2`, and so on, visible to admins).
- Prometheus metrics on port 4000 expose per action success and error counters.

## Clean up test data

Populate inserts documents with predictable id prefixes derived from a configuration hash (printed room names share the same hash). Remove them directly in MongoDB:

```javascript
const h = '<hash from the run>';
db.users.deleteMany({ _id: new RegExp('^uid-' + h) });
db.rocketchat_room.deleteMany({ _id: new RegExp('^rid-' + h) });
db.rocketchat_subscription.deleteMany({ _id: new RegExp('^sib-rid-' + h) });
db.rocketchat_message.deleteMany({ rid: new RegExp('^rid-' + h) });
```

The hash stays stable as long as the identity related settings (`HOW_MANY_USERS`, `USERS_PER_ROOM`, `TASK_ID`, id templates) do not change, so repeated runs reuse the same users.

## Troubleshooting

- **HTTP 429 on many routes**: the REST rate limiter is still enabled. See preparation above.
- **HTTP 400 "must NOT have additional properties" on users.presence**: you are running a tester version older than this one. Rocket.Chat 8.4.0 and later validate the query strictly; upgrade the tester.
- **Logins fail with 401**: users exist with a different password, or populate was skipped. Seeded users have password `performance`.
- **Empty presence results above 200 connections on CE**: expected, presence broadcast is disabled automatically. Use an EE license for large presence tests.
- **Populate hangs or times out**: check `DATABASE_URL`; single member replica sets usually need `?directConnection=true`.
- **Version compatibility**: this version targets Rocket.Chat 8.x. Login uses REST wrapped Meteor methods that still exist in 8.x (`license:getModules` and `license:isEnterprise` are deprecated for removal in 9.0, so expect login noise there when 9.0 arrives).
