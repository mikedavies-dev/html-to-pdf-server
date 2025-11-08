export function formatLog(...args: any[]): string {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  });

  return `[${timestamp}] ${formattedArgs.join(' | ')}`;
}

export const log = (...args: any[]) => {
  console.log(formatLog(...args));
};
