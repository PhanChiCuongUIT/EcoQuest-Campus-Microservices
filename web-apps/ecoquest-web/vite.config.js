import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gatewayTarget = process.env.VITE_API_BASE_URL || 'http://localhost:18080';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/auth':         { target: gatewayTarget, changeOrigin: true },
      '/catalog':      { target: gatewayTarget, changeOrigin: true },
      '/actions':      { target: gatewayTarget, changeOrigin: true },
      '/rewards':      { target: gatewayTarget, changeOrigin: true },
      '/leaderboards': { target: gatewayTarget, changeOrigin: true },
      '/recognitions': { target: gatewayTarget, changeOrigin: true },
    },
  },
});
