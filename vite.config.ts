import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { copyFileSync, cpSync, mkdirSync } from 'node:fs'

const copyExtensionFiles = () => ({
  name: 'copy-extension-files',
  closeBundle() {
    copyFileSync(resolve(import.meta.dirname, 'manifest.json'), resolve(import.meta.dirname, 'dist/manifest.json'))
    mkdirSync(resolve(import.meta.dirname, 'dist/dev'), { recursive: true })
    cpSync(resolve(import.meta.dirname, 'dev/form-test.html'), resolve(import.meta.dirname, 'dist/dev/form-test.html'))
  },
})

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' || chunk.name === 'content'
            ? `${chunk.name}.js`
            : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
