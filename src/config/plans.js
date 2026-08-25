export const plans = [
  {
    id: "starter-10",
    name: "Streetwise Starter",
    priceUsd: 10,
    billingPeriod: "month",
    dataGb: 3,
    validityDays: 30,
    coverageCountry: "US",
    provider: "esim-go",
    providerBundle: "esim_3GB_30D_US_V2",
    status: "selected",
    description: "3 GB of U.S. mobile data for 30 days. Initial provider quote is compatible with the $10/month target; launch remains gated on funding, billing, compliance, and live provisioning tests."
  },
  {
    id: "flex",
    name: "Streetwise Flex",
    priceUsd: null,
    billingPeriod: "variable",
    dataGb: null,
    status: "planned",
    description: "Future top-up/pay-as-you-go option for travelers and light-data customers."
  }
];
