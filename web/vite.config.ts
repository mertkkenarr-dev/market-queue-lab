import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Motor ve parametreler sim/ altında tek kaynak; web onları kopyalamadan doğrudan içe aktarır.
export default defineConfig({
  // Göreli yollar: derleme herhangi bir alt dizine (ör. kişisel sitede /projeler/kuyruk/) olduğu gibi konabilir.
  // Yönlendirme hash tabanlı olduğu için sunucu tarafında ek ayar gerekmez.
  base: './',
  plugins: [react()],
  // R3F ekosistemi tek React/three kopyası kullanmalı: ikinci kopya "Invalid hook call" verir.
  resolve: {
    alias: { '@sim': fileURLToPath(new URL('../sim/src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  // 3D laboratuvar (three + R3F, ~1 MB) yalnızca o sayfaya girilince yüklenir; giriş sayfası onu indirmez.
  build: { chunkSizeWarningLimit: 1100 },
  server: { port: Number(process.env.PORT) || 5191, fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.ts'] },
})
