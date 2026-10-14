# infra

puny-chat's infrastructure as Terraform: MongoDB on Atlas, DNS on Cloudflare, state in Cloudflare R2.
The server runs on a shared AWS Lightsail instance that Terraform does not manage (`server/deploy`). The web app is a Cloudflare Worker that CI deploys with wrangler
(`app/wrangler.jsonc`). Decisions and costs: `docs/server-design.md`, 인프라.

## Accounts and tokens (once, by hand)

Everything below goes into `infra/.env` (copy `.env.example`; ignored by git). Nothing here is committed.

1. **Cloudflare** (puny-chat.com, bought through Cloudflare Registrar)
   - Account id and the zone id of puny-chat.com: the zone's overview page.
   - R2: create a bucket `buddy-chat-tfstate`, then an R2 API token with Object Read & Write on it.
     Its Access Key ID and Secret go in `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
   - An API token from the "Edit Cloudflare Workers" template, plus Zone · DNS · Edit for puny-chat.com.
     Terraform uses it for DNS, and CI for the Worker (GitHub secret `CLOUDFLARE_API_TOKEN`).
2. **MongoDB Atlas**: an organization, then Access Manager → Service Accounts, with the
   Organization Project Creator role. Its client id and secret; the organization id (settings).
3. **AWS Lightsail** (not Terraform): the instance `quant-lab-02` in ap-southeast-2 with a static IP (`var.server_ip`).
   Firewall: 80 and 443 open; SSH only through the Lightsail browser connection.

## Apply

```sh
cd infra
set -a; . ./.env; set +a
terraform init -backend-config="endpoints={s3=\"$R2_ENDPOINT\"}"
terraform plan -out=prod.tfplan
terraform apply prod.tfplan
```

Show the plan before applying, especially when it changes or destroys something that exists.

## CI

As GitHub secrets and variables (the server image goes to GHCR with the workflow's own token, so there is no server secret):

```sh
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh variable set EXPO_PUBLIC_API_URL --body "$(terraform output -raw server_url)"
```

## The server on Lightsail

Files and setup are in `server/deploy`. On the instance, in `/opt/puny-chat`: `compose.yaml`, `Caddyfile`, `update.sh`
and `.env` (from `.env.example`; the MongoDB address comes from `terraform output -raw mongodb_uri`). Install
`puny-chat-update.service` and `.timer` into `/etc/systemd/system`, then `systemctl enable --now puny-chat-update.timer`.
After the first image is pushed, set the GHCR package `puny-chat-server` to Public once. After changing
`.env`, run `docker compose up -d` there. If the cluster is recreated, the new address goes into `.env` too.
