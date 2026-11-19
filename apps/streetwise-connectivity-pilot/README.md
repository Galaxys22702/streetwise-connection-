# Streetwise Connections connectivity pilot

This is the source for the mobile frontend, the Node API, and the Ubuntu 22.04 deployment templates. Keep the existing website and services in place until the pilot passes acceptance.

## Architecture and required inputs

- **Apex** `streetwiseconnection.com` serves `web/` on Vercel. Attach the domain in the selected Vercel project, then use that project's recommended apex record. The apex points at Vercel. It does not point at the Ubuntu host in this layout.
- **API and TURN** `api.streetwiseconnection.com` and `turn.streetwiseconnection.com` need DNS-only A records for the assigned Ubuntu public IPv4 address. If running behind NAT, set coturn's public/private mapping. Use a public IPv4 host with a working relay path.
- **CBRS** Provide the verified public egress CIDRs. A match only identifies the configured public IP range. It cannot prove that the handset currently uses CBRS radio access.
- **Pilot eSIM** Create an agreed test subscription in the authorized Gigs project using the provider workflow. Supply the matching subscription, user, plan, pilot email, ZIP, and a high-entropy access code privately. This API looks up an approved subscription and does not create, renew, or charge for one. The `smdp_url` response field contains the provider's full Apple installation link, which is sensitive.
- **TURN** Generate a shared secret with at least 32 random bytes. Put it in the server environment and coturn's private config. The browser receives time-limited credentials with allocation quotas. No static public TURN password is published.

## Ubuntu setup

Use current Node.js 22 or later and PM2 on Ubuntu 22.04. From an authenticated admin shell with the files already copied, install Nginx, coturn, and certbot through apt. Keep SSH accessible and allow TCP 80/443, UDP and TCP 3478, TCP 5349 for TURN over TLS, and UDP 49160–49200 for relay allocations in both the host firewall and cloud firewall. Do not enable or reset a firewall blindly.

1. Create `/var/www/streetwise-acme`. Enable `deploy/nginx-acme.conf` for the two subdomains and run `sudo nginx -t` before reloading. Once DNS points to this host, request separate certificates with `sudo certbot certonly --webroot -w /var/www/streetwise-acme -d api.streetwiseconnection.com` and the same command with `-d turn.streetwiseconnection.com`.
2. Put `deploy/nginx.conf` in place of the temporary ACME vhost. Keep its challenge locations for renewal. Run `sudo nginx -t` before reloading.
3. Create `/etc/streetwise/api.env` from the example. Make it readable only by the account running PM2. Set `TURN_URLS` to `turn:turn.streetwiseconnection.com:3478?transport=udp,turns:turn.streetwiseconnection.com:5349?transport=tcp`. Set `TRUST_LOOPBACK_PROXY=true` only with this Nginx setup. Add a preview origin only when needed for approved tests.
4. Use the coturn template in `/etc/turnserver.conf` with the private shared secret and any required NAT mapping. Use the packaged certificate helper after issuing the certificate. Verify the installed coturn service runs as a user in group `turnserver` before copying certs and restarting. Add a certbot renewal deploy hook for the TURN cert to run that helper and reload Nginx for the API cert. Keep the original configs available for rollback.
5. Start `pm2 start deploy/ecosystem.config.cjs` as the configured application user. Verify `curl --fail https://api.streetwiseconnection.com/healthz`, then persist PM2 only once it starts cleanly.

## Acceptance

- Run `node --test api/server.test.mjs`. Tests use local HTTP and a Gigs fixture.
- In Safari, confirm a 10-second test shows a verified relay-to-relay route, mean data-channel RTT, and probe counts. Verify with both Wi-Fi and mobile data. The requested AT&T 31 ms figure has no comparable source or methodology in this project.
- Keep `GIGS_ESIM_ENABLED=false` until the provider account, approved subscription, install eligibility, and test consent are verified privately. Confirm an unauthorized request is rejected. Enable for one invited participant, verify the link launches Apple setup on a compatible device, then verify line activation with the provider.
- The $0 for 60 days and $45 per month offer requires separate written provider approval, billing and cancellation implementation, and customer disclosures. This deployment does not advertise or enable that offer.
