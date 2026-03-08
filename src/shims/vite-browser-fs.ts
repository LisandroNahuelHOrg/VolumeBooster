function notAvailable(functionName: string): never {
  throw new Error(`Node fs shim invoked in browser build: ${functionName}`);
}

export const promises = {
  readFile: async () => notAvailable("promises.readFile"),
  writeFile: async () => notAvailable("promises.writeFile"),
  unlink: async () => notAvailable("promises.unlink")
};

export function readFile(): never {
  return notAvailable("readFile");
}

const fsShim = {
  promises,
  readFile
};

export default fsShim;
