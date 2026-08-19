# Local notification stack

Run this stack to test trade and expiry notifications locally. It does not require the API, Redis, or USD-price services.

The producer finds subscribed accounts and order data, emits notifications to RabbitMQ, and the Telegram app consumes that queue and sends messages.

## Services

Start these two services before starting either app:

```bash
docker compose up -d db queue
```

- `db` stores migrations and the notification producers' cursors.
- `queue` is RabbitMQ and carries notifications from the producer to Telegram.

When using this devcontainer with Docker running on the host, run the Docker command on the host and set `DATABASE_HOST=host.docker.internal` in the devcontainer's `.env`. Outside the devcontainer, use the host that reaches your Postgres instance (usually `localhost`).

## Environment

Copy the template once, then fill in the notification variables below:

```bash
cp .env.example .env
```

| Purpose                       | Required variables                                                                                                                                                                                  |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Local Postgres and migrations | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`                                                                                                         |
| RabbitMQ                      | `QUEUE_HOST`, `QUEUE_PORT`, `QUEUE_USER`, `QUEUE_PASSWORD`                                                                                                                                          |
| Telegram delivery             | `TELEGRAM_SECRET`                                                                                                                                                                                   |
| CMS subscriptions             | `CMS_API_KEY`, `CMS_BASE_URL` (set this to the local CMS URL when not using the default CMS)                                                                                                        |
| Order-book data               | `PROD_ORDERBOOK_DATABASE_HOST`, `PROD_ORDERBOOK_DATABASE_PORT`, `PROD_ORDERBOOK_DATABASE_USERNAME`, `PROD_ORDERBOOK_DATABASE_PASSWORD` for `COW_PROTOCOL_ENV=prod`; use the corresponding `BARN_ORDERBOOK_DATABASE_*` variables for `staging` |
| Chain access                  | `RPC_URL_<chainId>` for every enabled producer chain, for example `RPC_URL_11155111`                                                                                                                |
| Producer selection            | `NOTIFICATIONS_PRODUCER_CHAINS` and `COW_PROTOCOL_ENV`                                                                                                                                              |

For a local Sepolia setup, the relevant values normally include:

```dotenv
NOTIFICATIONS_PRODUCER_CHAINS=11155111
COW_PROTOCOL_ENV=staging
RPC_URL_11155111=https://your-sepolia-rpc
```

`COW_PROTOCOL_ENV=staging` makes the producer use the BARN settlement, ETH-flow address, and order-book database. Use `prod` only when testing production contracts; it uses the PROD order-book database.

## Start order

From the repository root, run the following in order:

```bash
# 1. Install dependencies once
yarn

# 2. Create/update the local notification schema
yarn migration:run

# 3. Start the queue consumer first
yarn telegram

# 4. In another terminal, start the producers
yarn producer
```

The producer starts CMS, trade, and expiry producers for the configured chains. The Telegram process listens on the same RabbitMQ queue and resolves each account's Telegram subscription through the CMS.

## Verify

1. Ensure the test account has a Telegram subscription in the configured CMS.
2. Place or fill an order for that account on an enabled chain.
3. Watch the producer log for a queued notification and the Telegram log for delivery.

Expiry notifications are intentionally delayed by one minute for order-book indexing, then checked every two minutes. A new expiry can therefore take up to roughly three minutes to arrive.

To test the queue and Telegram delivery without placing an order:

```bash
POST_TO_QUEUE_ACCOUNT=0x79063d9173C09887d536924E2F6eADbaBAc099f5 \
  nx test notification-producer --testFile=src/sendPush.test.ts --skip-nx-cache
```

## Troubleshooting

- `ECONNREFUSED 127.0.0.1:5432` from `yarn migration:run` in the devcontainer means the database is on the host but `DATABASE_HOST` still points at the container. Set it to `host.docker.internal`.
- Missing the order-book variables for the selected `COW_PROTOCOL_ENV` prevents the producer from loading order data and expiration.
- If no chains are set, the producer tries every supported EVM chain. Set `NOTIFICATIONS_PRODUCER_CHAINS` to keep local testing focused.
