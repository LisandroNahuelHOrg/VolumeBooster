export function appendWorkerConsoleMessage(workerLogs, message) {
  workerLogs.push({
    location: message.location(),
    text: message.text(),
    type: message.type()
  });
}
