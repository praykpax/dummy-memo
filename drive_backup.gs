/**
 * Muhasebe → Google Drive Otomatik Yedek Servisi  (Günlük Kalıcı + Son 300 Detaylı)
 * ---------------------------------------------------------------------------------
 * Bu Apps Script, web uygulamasından gelen her değişikliği iki katmanda yedekler:
 *
 *   1) GÜNLÜK KALICI:  Her gün için tek bir dosya (o günün en son hâli).
 *      "Muhasebe Yedekleri/Gunluk" klasörüne yazılır ve ASLA SİLİNMEZ.
 *      → İstediğiniz herhangi bir güne (aylar/yıllar öncesine) geri dönebilirsiniz.
 *
 *   2) SON 300 DETAYLI:  Gün içindeki her tek kaydın ayrı dosyası.
 *      "Muhasebe Yedekleri" ana klasörüne yazılır. Sayı 300'ü aşınca en eskiler
 *      çöpe atılır (gün içi ince kurtarma için). Günlük kalıcı katman her günü
 *      zaten koruduğu için hiçbir gün kaybolmaz.
 *
 * Kimlik bilgisi (anahtar/şifre) istemci tarafına HİÇ çıkmaz — güvenlidir.
 *
 * KURULUM (tek seferlik):
 * 1. https://script.google.com → "Yeni proje"
 * 2. Bu dosyanın tamamını yapıştırın (Code.gs içine).
 * 3. Sağ üstte "Dağıt" (Deploy) → "Yeni dağıtım" → tür: "Web uygulaması".
 *    - "Şu kullanıcı olarak çalıştır": Ben (kendi hesabınız)
 *    - "Erişebilenler": Herkes (Anyone)
 *    → Dağıt. İzin isteyince onaylayın.
 * 4. Çıkan ".../exec" ile biten URL'i kopyalayın.
 * 5. index.html içindeki  const DRIVE_URL='';  satırına yapıştırın.
 *    Örn: const DRIVE_URL='https://script.google.com/macros/s/AKfyc.../exec';
 * 6. Kaydedip push edin. Artık her değişiklikte Drive'a otomatik yedek düşer.
 */

const ANA_KLASOR   = 'Muhasebe Yedekleri';
const GUNLUK_KLASOR = 'Gunluk';
const SON_KAC_DETAY = 300;          // ana klasörde tutulacak detaylı yedek sayısı
const ZAMAN_DILIMI  = 'GMT+3';      // Türkiye

function doPost(e) {
  try {
    const govde = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const now = new Date();
    const damga = Utilities.formatDate(now, ZAMAN_DILIMI, 'yyyy-MM-dd_HH-mm-ss');
    const gun   = Utilities.formatDate(now, ZAMAN_DILIMI, 'yyyy-MM-dd');

    const ana = klasorAl_(ANA_KLASOR);

    // 1) Detaylı (son 300) — her kayıt yeni dosya
    ana.createFile('muhasebe-yedek-' + damga + '.json', govde, 'application/json');
    detaylariTemizle_(ana);

    // 2) Günlük kalıcı — gün dosyasını güncelle/oluştur, asla silme
    const gunluk = altKlasorAl_(ana, GUNLUK_KLASOR);
    gunlukYaz_(gunluk, 'muhasebe-gunluk-' + gun + '.json', govde);

    return cikti_({ ok: true });
  } catch (err) {
    return cikti_({ ok: false, hata: String(err) });
  }
}

function doGet() {
  return cikti_({ ok: true, mesaj: 'Yedek servisi çalışıyor. Veri göndermek için POST kullanın.' });
}

function klasorAl_(ad) {
  const it = DriveApp.getFoldersByName(ad);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ad);
}

function altKlasorAl_(ust, ad) {
  const it = ust.getFoldersByName(ad);
  return it.hasNext() ? it.next() : ust.createFolder(ad);
}

// Günün dosyası varsa içeriğini güncelle, yoksa oluştur. (Gün dosyaları asla silinmez)
function gunlukYaz_(klasor, ad, icerik) {
  const it = klasor.getFilesByName(ad);
  if (it.hasNext()) {
    it.next().setContent(icerik);
  } else {
    klasor.createFile(ad, icerik, 'application/json');
  }
}

// Sadece ANA klasördeki "muhasebe-yedek-" detay dosyalarını 300 ile sınırla
function detaylariTemizle_(klasor) {
  const dosyalar = [];
  const it = klasor.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().indexOf('muhasebe-yedek-') === 0) dosyalar.push(f);
  }
  if (dosyalar.length <= SON_KAC_DETAY) return;
  dosyalar.sort(function (a, b) { return a.getDateCreated() - b.getDateCreated(); });
  const silinecek = dosyalar.length - SON_KAC_DETAY;
  for (let i = 0; i < silinecek; i++) dosyalar[i].setTrashed(true);
}

function cikti_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
