import { defineConfig } from 'vitest/config'

// Teori testleri bilerek ağır (yüzlerce uzun koşu, istatistiksel sınır dar): yerelde ~1 sn,
// paylaşımlı CI makinelerinde 5 sn varsayılanını aşabiliyor. Sınırı gevşetmek, testi zayıflatmaktan iyi.
export default defineConfig({
  test: { testTimeout: 60_000 },
})
