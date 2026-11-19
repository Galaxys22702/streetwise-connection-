# JARVIS connectivity pilot checks

Run on request, using the existing no-cost JARVIS workflow. Check DNS for `streetwiseconnection.com`, `api.streetwiseconnection.com`, and `turn.streetwiseconnection.com`, and check HTTPS `GET /healthz` and `GET /v1/status` on `api.streetwiseconnection.com` when reachable. Record the check time, observed result, and smallest reversible next step. Report DNS, API, TURN, and eSIM separately.

A health response verifies the API only. `turn_ready` and `esim_ready` are configuration indicators. Require an actual Safari relay-only test for TURN verification and an authorized completed provider/device test for eSIM verification. An IP range match is unable to prove CBRS radio attachment. Treat the 31 ms comparison and proposed trial or price as unverified until supported by comparable measurements and approved terms.

Use read-only checks. Keep credentials, access codes, and install links private. Leave deployments, DNS writes, TURN allocation, eSIM orders, and billing to explicitly authorized operator actions.
