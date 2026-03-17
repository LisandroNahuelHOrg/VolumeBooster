export function parseLicenseCliOptions(argv) {
  const options = {};
  let index = 2;

  while (index < argv.length) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unknown argument '${token}'.`);
    }

    const separatorIndex = token.indexOf("=");
    const optionName = separatorIndex >= 0 ? token.slice(2, separatorIndex) : token.slice(2);

    if (!optionName) {
      throw new Error(`Invalid option '${token}'.`);
    }

    if (separatorIndex >= 0) {
      options[optionName] = token.slice(separatorIndex + 1);
      index += 1;
      continue;
    }

    index += 1;

    if (index >= argv.length) {
      throw new Error(`Missing value for '--${optionName}'.`);
    }

    options[optionName] = argv[index];
    index += 1;
  }

  return options;
}
