export const FIXED_ISSUED_AT = "2026-03-16T12:00:00.000Z";

export const EXAMPLE_LICENSE_OPTIONS = {
  licenseName: "Вагиф Сәмәдоғлу",
  licenseCompany: "FooBar Inc.",
  licenseEmail: "vagif.samadoghlu@example.com",
  licenseQuantity: "1",
  product: "volume-booster-by-premium11",
  sku: "TEST_PRODUCT_SKU",
  productAttributesJson: "{\"TEST_PRODUCT_ATTRIBUTE\":\"TEST_PRODUCT_VALUE\"}",
  orderReference: "TEST_REF",
  subscriptionId: "TEST_SUB_ID",
  subscriptionSequence: "1",
  subscriptionPeriods: "1",
  subscriptionAttributesJson: "{\"TEST_SUBSCRIPTION_ATTRIBUTE\":\"TEST_SUBSCRIPTION_VALUE\"}",
  issuedAt: FIXED_ISSUED_AT
} as const;
