/**
 * Uygulama açılır açılmaz tek satır yazar. _layout.tsx'in EN İLK import'u olmalı.
 * Böylece çökme çok erken olsa bile log dosyası oluşur.
 */
import * as FileSystem from "expo-file-system";

const LOG_FILE = "islamic_app_debug.log";

(function writeInitLine() {
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  const path = dir + LOG_FILE;
  const line = `${new Date().toISOString()} [debugLogInit] app process started\n`;
  FileSystem.writeAsStringAsync(path, line).catch(() => {});
})();
