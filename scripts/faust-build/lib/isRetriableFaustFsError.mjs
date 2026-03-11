export function isRetriableFaustFsError(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "EBUSY" || error.code === "EPERM")
  );
}
