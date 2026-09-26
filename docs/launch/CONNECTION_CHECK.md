# Streetwise Connection — Connection Check

## Purpose

The Connection Check is a planned pre-purchase suitability flow. It should help a customer determine whether Streetwise is appropriate before payment or activation.

It must remain informational until provider coverage, device compatibility rules and launch bundles are verified.

## Inputs

Collect only the minimum information needed for suitability:

1. customer type: residential or commercial;
2. device manufacturer/model plus SIM/eSIM and cellular-feature compatibility confirmation;
3. intended U.S. usage area;
4. expected usage level;
5. hotspot/tethering need;
6. voice and messaging need;
7. phone-number service need;
8. international/travel need;
9. number of business lines, when commercial;
10. whether setup assistance is needed.

Do not collect payment details in the Connection Check.

## Planned outputs

The flow may return:

- likely compatible / needs manual review / not currently supported;
- recommended Streetwise tier;
- confirmed provider-backed allowance and hotspot terms, once available;
- confirmed voice, messaging and phone-number availability, once available;
- any device, network, roaming or coverage caveats;
- setup-support path;
- a clear statement that final availability is confirmed at checkout only after launch gates pass.

## Recommendation mapping

Initial target pricing structure:

- Residential: Streetwise Home — $25/month
- Commercial single/small line need: Business Starter — $20/month per line
- Commercial 3+ lines: Business Volume — $15/month per line
- Higher-service commercial use: Business Pro — $30/month per line

The recommendation engine must not infer unlimited service from price or from one provider bundle.

## Safety requirements

Before this flow can recommend a live sellable plan, the selected plan must have:

- an approved provider bundle mapping;
- written recurring U.S. domestic-use permission;
- residential/commercial resale permission as applicable;
- verified data allowance and throttling terms;
- verified hotspot rules;
- verified voice, messaging and phone-number terms when included;
- verified network and roaming terms;
- approved contribution margin;
- approved customer disclosures.

If any requirement is missing, the flow should return a waitlist or manual-review state rather than a purchase action.

## Future API shape

A future endpoint may accept a request such as:

```json
{
  "audience": "residential",
  "device": "example-device",
  "usageArea": "US",
  "usageLevel": "moderate",
  "hotspotNeeded": true,
  "lineCount": 1,
  "setupHelp": true
}
```

and return a suitability result without creating an order or payment session.

No implementation should enable checkout, payment or provider ordering as a side effect of this check.
