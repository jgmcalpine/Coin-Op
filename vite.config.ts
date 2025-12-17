import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true, // Fail if port is busy, don't auto-switch to 5174
    host: "127.0.0.1",
    hmr: {
      clientPort: 5173, // Force the websocket to use the same port
    },
    cors: true, // Enable CORS for Chrome Extension
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
})