# APK çökme loglarını alma

Uygulama APK olarak telefonda splash ekranında kapanıyorsa, çökmeden önce yazılan loglar cihazda bir dosyaya yazılıyor.

## Adımlar

1. Yeni APK’yı yükleyip uygulamayı en az bir kez çalıştırın (splash’ta kapansa da olur).
2. Telefonu USB ile bilgisayara bağlayın, USB hata ayıklama açık olsun.
3. Bilgisayarda terminalde:

```bash
adb shell run-as com.islamicapp.app cat /data/data/com.islamicapp.app/files/islamic_app_debug.log
```

4. Çıktıyı kopyalayıp paylaşın. Son satırlar çökme noktasını gösterecek.

## Logu dosyaya kaydetmek

```bash
adb shell run-as com.islamicapp.app cat /data/data/com.islamicapp.app/files/islamic_app_debug.log > debug.log
```

## Not

- `run-as` sadece debug/release imzalı yüklemede çalışır; çoğu EAS/yerel build’de çalışır.
- JS tarafındaki hatalar hem bu log dosyasına hem de Error Boundary ekranına düşer.
- Tamamen native (C++/Java) çökmeler bu dosyada görünmez; onlar için `adb logcat` kullanın.
