import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Motor ve parametreler sim/ altında tek kaynak; web onları kopyalamadan doğrudan içe aktarır.
export default defineConfig({
  plugins: [react()],
  // R3F ekosistemi tek React/three kopyası kullanmalı: ikinci kopya "Invalid hook call" verir.
  resolve: {
    alias: { '@sim': fileURLToPath(new URL('../sim/src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  server: { port: 5191, fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.ts'] },
})
