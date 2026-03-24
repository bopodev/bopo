export function formatStdoutEvent(line: string, debug: boolean) {
  if (debug || line.includes("[bopo-openclaw]") || line.includes("[bopo-openclaw:event]")) {
    process.stdout.write(line.endsWith("\n") ? line : `${line}\n`);
  }
}
