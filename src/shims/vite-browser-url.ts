function notAvailable(functionName: string): never {
  throw new Error(`Node url shim invoked in browser build: ${functionName}`);
}

export function pathToFileURL(): never {
  return notAvailable("pathToFileURL");
}

const urlShim = {
  pathToFileURL
};

export default urlShim;
