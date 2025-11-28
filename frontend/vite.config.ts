import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard Vite build - outputs separate JS/CSS files
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: false, // Don't empty dist as it might contain appsscript.json
    rollupOptions: {
      output: {
        // Generate predictable filenames for post-processing
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
