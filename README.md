# Nanogram Atölyesi

**Türkçe** | [English](#english)

Tarayıcıda çalışan renkli bir nonogram (picross) oyunu ve bulmaca editörü. Satır ve sütun sayılarına göre hücreleri boyayarak gizli resmi ortaya çıkarırsın ya da kendi bulmacanı çizip sayılarını oluşturursun.

## Özellikler
- **Örnek seviyeler:** Seviye listesinden bir bulmaca seç ve "Seviyeyi Başlat" ile oyna; çözünce başarı kontrolü yapılır.
- **Renkli nonogram:** Birden fazla renk desteklenir; renk paletine özel renk eklenebilir.
- **Editör:** Kalem/Silgi araçlarıyla çiz, sayılar canlı olarak güncellenir.
- **Sayı düzenleme:** Sayı hücresine tıkla artır, sağ tıkla azalt, çift tıkla elle değer gir (Enter, Esc, ↑/↓ desteklenir).
- **Sayıdan görsel oluştur:** Girilen ipuçlarından resmi çözen yerleşik çözücü (geri izlemeli).
- **Tuval ayarı:** 5–30 satır/sütun, ayarlanabilir hücre boyutu, ekrana otomatik sığdırma.
- İsteğe bağlı üst sayılar, mobil uyumlu kontroller.

## Çalıştırma
Gereksinim: Node.js (harici bağımlılık yok).
```bash
npm start
```
Ardından tarayıcıda `http://localhost:3000` adresini aç (port `PORT` ortam değişkeniyle değiştirilebilir).

## Nasıl Oynanır
- Satır/sütun başındaki sayılar ardışık boyalı blokları gösterir. Örnek: "3 1 2" → 3 boyalı, en az 1 boş, 1 boyalı, en az 1 boş, 2 boyalı.
- **Sol tık / sürükle:** Seçili renkle boya.
- **Sağ tık:** Hücreyi temizle / boş işaretle.
- **Mobil:** Silgi aracını kullan.

## Proje Yapısı
```
server.js          # Bağımlılıksız Node.js statik dosya sunucusu
public/index.html  # Arayüz
public/app.js      # Oyun, editör ve çözücü mantığı
public/styles.css  # Stiller
```

## Teknolojiler
Node.js (`http` modülü), saf JavaScript, HTML5, CSS.

## Proje Tarihleri
- Oluşturulma: 30 Ocak 2026
- Son güncelleme: 30 Ocak 2026

## Lisans
Repoda lisans dosyası yok (`package.json` içinde "MIT" yazıyor).

---

## English

A colorful nonogram (picross) puzzle game and editor that runs in the browser. Fill cells according to the row/column clues to reveal the hidden picture, or draw your own puzzle and generate its clues.

### Features
- **Sample levels** with a success check when solved.
- **Multi-color nonograms** with a customizable palette.
- **Editor:** pen/eraser tools, live clue updates.
- **Clue editing:** click to increase, right-click to decrease, double-click to type a value.
- **Generate image from clues:** built-in backtracking solver.
- **Canvas settings:** 5–30 rows/columns, adjustable cell size, auto-fit.
- Optional top clues, mobile-friendly controls.

### Running
Requires Node.js (no external dependencies).
```bash
npm start
```
Open `http://localhost:3000` (override with the `PORT` environment variable).

### How to Play
Left click/drag paints with the selected color, right click clears or marks a cell empty; on mobile use the eraser tool.

### Tech Stack
Node.js (`http`), vanilla JavaScript, HTML5, CSS.

### Project Dates
- Created: January 30, 2026
- Last updated: January 30, 2026

### License
No license file in the repository (`package.json` lists "MIT").
