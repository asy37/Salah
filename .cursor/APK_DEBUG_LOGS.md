# APK çökme loglarını alma

Uygulama APK olarak telefonda splash ekranında kapanıyorsa, çökmeden önce yazılan loglar cihazda bir dosyaya yazılıyor.

## Önemli: Debuggable APK gerekli

`adb run-as` komutu **sadece debuggable (debug) APK** ile çalışır. Production/release APK’da `package not debuggable` hatası alırsınız.

**Test için preview (debug) APK kullanın:**

```bash
npm run build:android:debug
# veya
npx eas build --platform android --profile preview
```

İndirdiğiniz APK’yı telefona yükleyin. Bu build’de `run-as` çalışır ve log dosyası okunabilir.

## Adımlar

1. **Preview** profili ile APK alıp yükleyin (yukarıdaki gibi).
2. Uygulamayı en az bir kez çalıştırın (splash’ta kapansa da olur).
3. Telefonu USB ile bilgisayara bağlayın, USB hata ayıklama açık olsun.
4. Bilgisayarda terminalde:

```bash
adb shell run-as com.islamicapp.app cat /data/data/com.islamicapp.app/files/islamic_app_debug.log
```

4. Çıktıyı kopyalayıp paylaşın. Son satırlar çökme noktasını gösterecek.

## Logu dosyaya kaydetmek

```bash
adb shell run-as com.islamicapp.app cat /data/data/com.islamicapp.app/files/islamic_app_debug.log > debug.log
```

## Dosya yoksa (No such file or directory)

- Uygulama, ilk log satırı yazılmadan çöküyor olabilir. `_layout` içinde en ilk import olarak `debugLogInit` eklendi; yeni APK’da ilk açılışta bir satır yazılmalı.
- Yeni preview APK build alıp tekrar deneyin. Hâlâ yoksa çökme büyük ihtimalle **JS çalışmadan önce** (native tarafta). O zaman:
  ```bash
  adb logcat *:E | head -100
  ```
  veya uygulama açılırken:
  ```bash
  adb logcat | grep -i -E "ReactNative|com.islamicapp|FATAL|AndroidRuntime"
  ```
  çıktısına bakın; native crash stack’i orada görünür.

## Not

- `run-as` sadece debuggable APK’da çalışır (preview profile).
- JS tarafındaki hatalar hem bu log dosyasına hem de Error Boundary ekranına düşer.
- Tamamen native çökmeler bu dosyada görünmez; onlar için `adb logcat` kullanın.
