/**
 * APK / standalone build için cihazda dosyaya yazan debug logger.
 * Loglar uygulama veri dizininde kalır; adb ile çekilebilir.
 */
import * as FileSystem from "expo-file-system";

const LOG_FILE = "islamic_app_debug.log";
let writeQueue = Promise.resolve();

function getPath(): string {
  return (FileSystem.documentDirectory ?? "") + LOG_FILE;
}

function formatLine(location: string, message: string, data: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const dataStr = Object.keys(data).length ? ` ${JSON.stringify(data)}` : "";
  return `${ts} [${location}] ${message}${dataStr}\n`;
}

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const line = formatLine(location, message, data);
  writeQueue = writeQueue
    .then(async () => {
      try {
        let existing = "";
        try {
          existing = await FileSystem.readAsStringAsync(getPath());
        } catch {
          // dosya yok
        }
        await FileSystem.writeAsStringAsync(getPath(), existing + line);
      } catch {
        // sessizce devam
      }
    })
    .catch(() => {});
}
