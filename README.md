# market-queue-lab

Süpermarket kasa kuyruğu simülatörü: gerçek POS verisinden (Antczak & Weron 2019, CC BY-NC) öğrenilmiş müşteri, sepet ve servis süresi modeli,
ayrık-olay simülasyon motoru, teoriye karşı ve zaman-dışı veriye karşı doğrulama.

```mermaid
flowchart LR
  A[POS işlem verisi<br/>3 dönem] --> B[Python: DuckDB + scipy<br/>scripts/03_fit.py]
  B --> C[sim/params.json<br/>sepet pmf bağlam başına, servis süresi,<br/>varış profili, kanal payı]
  C --> D[TypeScript motor sim/src<br/>olay yığını, NHPP, ortak rastgele sayılar]
  D --> E[Teori doğrulaması<br/>Erlang-C, P-K, Little]
  D --> F[Kayan-başlangıç doğrulaması<br/>holdout.ts]
  D --> I[sweep.ts: 12k senaryo]
  I --> J[Vekil model: sklearn GBM<br/>ml/01_surrogate.py]
  J -->|ağaçlar JSON| K[web: tarayıcıda değerlendirici<br/>parite testli]
  D -->|aynı kaynak| L[web: R3F sahnesi<br/>olay izini oynatır]
  F --> M[docs/ ve web Doğrulama sayfası]
  K --> N[web: Kaç kasa lazım?<br/>simülatörle sınama]
```

Neden bu yığın: veri hazırlama ve istatistiksel uydurma Python'da (DuckDB, scipy) kısa; simülasyon motoru ise web katmanında (R3F) aynen çalışacağı için
TypeScript'te, parametreler zod ile çalışma anında doğrulanan bir JSON dosyasıyla taşınıyor. Backend gerekmiyor.

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
(cd sim && npm install && npm test) && (cd web && npm install && npm run dev)
```

## Web arayüzü (`web/`)

- **Laboratuvar:** Gerçek yürüme hızıyla çalışan 3D mağaza. Üç kuyruk düzeni (ayrı/en kısayı seçer, ayrı/rastgele seçer, tek ortak kıvrımlı kuyruk) yan yana, aynı müşteri akışıyla. Altında 30 tekrarlı eşleştirilmiş karşılaştırma ve kuyruk uzunluğu grafiği.
- **Kaç kasa lazım?:** Tarayıcıda çalışan vekil modelle saat saat kasa planı; her satır gerçek simülatörle sınanabilir.
- **Doğrulama:** Teoriye ve görülmemiş döneme karşı sonuçlar, kayma, kalibrasyon ve sınırlar.

Motor `sim/src`'ten kopyalanmadan içe aktarılır; sahne motorun ürettiği olay izini oynatır, ayrı bir animasyon verisi yoktur.
Vekil model Python'da eğitilir (`ml/`), ağaçları `ml/05_export_web.py` ile JSON'a dökülür ve web testi tarayıcı değerlendiricisini scikit-learn tahminleriyle karşılaştırır.

ML katmanı (vekil model, personel planı, varış tahmini): [docs/ML.md](docs/ML.md).

Veri ve indirme: `data/README.md`. Doğrulamanın tamamı ve sınırlamalar: [docs/VALIDATION.md](docs/VALIDATION.md).
