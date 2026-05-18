type LogPayload = Record<string, unknown>;

export const logger = {
  info(message: string, payload?: LogPayload) {
    process.stdout.write(`${message}${payload ? ` ${JSON.stringify(payload)}` : ""}\n`);
  },
  error(message: string, payload?: LogPayload) {
    process.stderr.write(`${message}${payload ? ` ${JSON.stringify(payload)}` : ""}\n`);
  },
};
