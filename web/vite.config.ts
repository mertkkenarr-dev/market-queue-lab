import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Motor ve parametreler sim/ altında tek kaynak; web onları kopyalamadan doğrudan içe aktarır.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@sim': fileURLToPath(new URL('../sim/src', import.meta.url)) } },
  server: { port: 5191, fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.ts'] },
})
