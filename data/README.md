# Veri

Gerçek veri: Antczak & Weron (2019), "Point of Sale (POS) Data from a
Supermarket: Transactions and Cashier Operations", Data 4(2), 67.
DOI: 10.3390/data4020067. Veri lisansı: CC BY-NC (ticari olmayan kullanım).

Kaynak mağaza: Güney Polonya'da büyük bir şehirde, büyük bir Avrupa zincirine
ait süpermarket. Kasa düzeni (makaleden): her servis kasası için ayrı bir
bekleme hattı, tüm self-servis kasalar için tek ortak hat.
`WorkstationGroupID`: 1 = servis (kasiyerli), 8 = self-servis.

Dönemler: 2017-12-07..19, 2019-02-13..26, 2019-03-28..04-10 (toplam 163.269 işlem).

İndirme (MDPI botları engelliyor, tarayıcıdan indirin):
1. https://www.mdpi.com/2306-5729/4/2/67 sayfasından Supplementary ZIP'i indirin
2. 6 CSV'yi `data/raw/` altına koyun. Ham veri depoya commit'lenmez.
3. `python scripts/01_load.py` sonra `python scripts/02_eda.py`
