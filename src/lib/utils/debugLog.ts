/**
 * APK / standalone build için cihazda dosyaya yazan debug logger.
 * Loglar uygulama veri dizininde kalır; adb ile çekilebilir.
 */
import { Paths, File } from "expo-file-system";

const LOG_FILE = "salah_debug.log";
let writeQueue = Promise.resolve();

function getLogFile(): File {
  return new File(Paths.document, LOG_FILE);
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
        const file = getLogFile();
        let existing = "";
        try {
          if (file.exists) existing = await file.text();
        } catch {
          // dosya yok veya okunamadı
        }
        try {
          if (!file.exists) file.create();
        } catch {
          // zaten var veya oluşturulamadı
        }
        file.write(existing + line);
      } catch {
        // sessizce devam
      }
    })
    .catch(() => {});
}
