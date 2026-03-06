/**
 * Uygulama açılır açılmaz tek satır yazar. _layout.tsx'in EN İLK import'u olmalı.
 * Böylece çökme çok erken olsa bile log dosyası oluşur.
 */
import { Paths, File } from "expo-file-system";

const LOG_FILE = "salah_debug.log";

(function writeInitLine() {
  (async () => {
    try {
      const file = new File(Paths.document, LOG_FILE);
      let existing = "";
      if (file.exists) existing = await file.text();
      if (!file.exists) file.create();
      const line = `${new Date().toISOString()} [debugLogInit] app process started\n`;
      file.write(existing + line);
    } catch {
      // sessizce devam
    }
  })().catch(() => {});
})();
