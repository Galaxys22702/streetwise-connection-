# Storefront Commerce Foundation

The commerce layer defines the customer purchase flow without coupling Jarvis to a specific payment provider.

## Customer flow

```text
Browse catalogue
      |
      v
View product + authoritative price
      |
      v
Add to cart
      |
      v
Prepare checkout
      |
      v
Approved payment boundary
      |
      v
Verify payment
      |
      v
Confirm order
      |
      v
Audit event
```

## Current foundation

- Product catalogue and search are read-only.
- Prices are represented as integer cents and a currency code.
- Cart state is isolated behind a small store interface.
- Checkout creates a payment-provider-neutral session boundary.
- Order confirmation requires the payment boundary to report `paid`.
- Payment credentials are never accepted by the Jarvis commerce tools.
- High-impact checkout/order operations are disabled for production until a separate security and authorisation review is completed.

## Store-opening boundary

The existing Streetwise public launch mode remains authoritative. This layer does not open the storefront, enable live billing, provision service, or bypass launch gates.

When the business is ready to accept customers, the production integration should connect these interfaces to the existing Streetwise product, payment, provider, and launch-control services rather than creating a second system of record.

## Capability identifiers

- `commerce.products.list`
- `commerce.pricing.get`
- `commerce.cart.add`
- `commerce.checkout.prepare`
- `commerce.orders.confirm`

## Required production work

1. Connect catalogue data to the authoritative Streetwise product source.
2. Connect pricing to the authoritative commercial source.
3. Implement a trusted payment checkout boundary.
4. Verify payment server-side before order confirmation.
5. Add idempotency and retry handling.
6. Define fulfilment/provisioning and cancellation behaviour.
7. Add integration tests and production smoke checks.
8. Complete the separate security and authorisation review before enabling production billing or provisioning.
