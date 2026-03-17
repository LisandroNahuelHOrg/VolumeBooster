export function createLicenseProviderContext(options) {
  return {
    name: options.licenseName,
    company: options.licenseCompany,
    email: options.licenseEmail,
    quantity: options.licenseQuantity,
    product: options.product,
    sku: options.sku,
    productAttributesJson: options.productAttributesJson,
    reference: options.orderReference,
    subscription: options.subscriptionId,
    subscriptionSequence: options.subscriptionSequence,
    subscriptionPeriods: options.subscriptionPeriods,
    subscriptionAttributesJson: options.subscriptionAttributesJson,
    issuedAt: options.issuedAt,
    encodeURIComponent,
    unescape,
    Uint8Array,
    Uint32Array,
    Float64Array
  };
}
