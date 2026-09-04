# Streetwise Open5GS Lab v0.1

Status: isolated engineering scaffold; **not production cellular infrastructure**.

## Purpose

This directory is the first implementation step from `docs/OPEN_NETWORK_TECHNOLOGY.md`. It creates a safe boundary for Open5GS research without connecting the lab to Streetwise customer, billing, provider, Vercel, or production database systems.

Open5GS implements LTE EPC and 5G Core network functions. The upstream project uses MongoDB for subscriber/core data and provides Docker-based development and testing workflows.

## v0.1 scope

- isolated Docker network
- MongoDB dedicated to the lab
- placeholder Open5GS core service profile
- synthetic test identity configuration only
- configuration validation
- explicit teardown procedure

## Safety boundary

Never place any of the following in this directory or Git history:

- real IMSI/IMEI/MSISDN values
- Ki, OP, OPc, SQN or production SIM credentials
- eSIM activation codes
- AT&T, 1GLOBAL, eSIM Go, Stripe or Supabase secrets
- customer PII
- production database URLs or credentials
- private keys

The example MCC/MNC values are lab identifiers only. This scaffold does not transmit RF, provision real SIMs/eSIMs, provide emergency calling, or create carrier authority.

## Files

```text
lab/open5gs/
├── README.md
├── .env.example
└── compose.yml
```

## Validation

From the repository root:

```bash
cp lab/open5gs/.env.example lab/open5gs/.env
docker compose --env-file lab/open5gs/.env -f lab/open5gs/compose.yml config
```

The `config` command validates the Compose model. It does not prove that a mobile core is operational.

## Start the v0.1 infrastructure

```bash
docker compose --env-file lab/open5gs/.env -f lab/open5gs/compose.yml up -d mongodb
```

Check MongoDB:

```bash
docker compose --env-file lab/open5gs/.env -f lab/open5gs/compose.yml ps
```

## Teardown

```bash
docker compose --env-file lab/open5gs/.env -f lab/open5gs/compose.yml down -v --remove-orphans
```

Using `-v` intentionally destroys the lab database. Do not use this command against production Compose projects.

## Next milestone

After this scaffold passes configuration validation, add a pinned Open5GS core build/runtime profile and synthetic UE/RAN simulation. Keep that work on the lab branch until configuration and security checks pass.

## References

- https://open5gs.org/open5gs/docs/
- https://open5gs.org/open5gs/docs/guide/01-quickstart/
- https://github.com/open5gs/open5gs/tree/main/docker
