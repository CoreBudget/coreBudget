export interface ApiEndpointDoc {
  slug: string;
  path: string;
  labelKey: string;
  featureKey: string;
  descriptionKey: string;
  exampleResponse: unknown;
}

export const API_ENDPOINT_DOCS: ApiEndpointDoc[] = [
  {
    slug: "net-worth",
    path: "/api/v1/net-worth",
    labelKey: "netWorth",
    featureKey: "netWorth",
    descriptionKey: "netWorth",
    exampleResponse: {
      netWorth: 125430.5,
      totalCash: 18500.0,
      totalCredit: -1200.75,
      totalAssets: 310000.0,
      totalLoans: 201868.75,
      currencyCode: "USD",
      generatedAt: "2026-09-12T14:20:12.442Z",
    },
  },
  {
    slug: "accounts",
    path: "/api/v1/accounts",
    labelKey: "accounts",
    featureKey: "accounts",
    descriptionKey: "accounts",
    exampleResponse: {
      accounts: [
        {
          id: "31f908db-b2de-445e-95be-ffab5fc95298",
          name: "Main Checking",
          type: "checking",
          balance: 3421.55,
        },
        {
          id: "f7f96b8b-c23d-425c-95c6-deb1c2f374d5",
          name: "Visa",
          type: "credit",
          balance: -412.3,
        },
      ],
      currencyCode: "USD",
      generatedAt: "2026-09-12T14:20:12.460Z",
    },
  },
  {
    slug: "budget-status",
    path: "/api/v1/budget-status",
    labelKey: "budgetStatus",
    featureKey: "budgetStatus",
    descriptionKey: "budgetStatus",
    exampleResponse: {
      month: "2026-09",
      assigned: 4200.0,
      activity: -3150.42,
      available: 1049.58,
      categoriesOverBudget: 2,
      currencyCode: "USD",
      generatedAt: "2026-09-12T14:20:12.500Z",
    },
  },
  {
    slug: "categories",
    path: "/api/v1/categories",
    labelKey: "categories",
    featureKey: "budgetStatus",
    descriptionKey: "categories",
    exampleResponse: {
      month: "2026-09",
      categories: [
        {
          id: "81b8d8b5-b3ef-4218-a31d-907b501b7859",
          name: "Groceries",
          sectionName: "Everyday Expenses",
          assigned: 500,
          activity: -412.3,
          available: 87.7,
        },
      ],
      currencyCode: "USD",
      generatedAt: "2026-09-12T14:20:12.512Z",
    },
  },
];

export function getApiEndpointDoc(slug: string): ApiEndpointDoc | undefined {
  return API_ENDPOINT_DOCS.find((e) => e.slug === slug);
}

export const API_ERROR_EXAMPLES = [
  { status: 401, body: { error: "Missing or malformed Authorization header." } },
  { status: 401, body: { error: "Invalid or revoked API token." } },
  { status: 403, body: { error: "This token's owner does not have access to this data." } },
  {
    status: 429,
    body: { error: "Rate limit exceeded (60 requests/minute per token)." },
    header: "Retry-After: 23",
  },
] as const;
