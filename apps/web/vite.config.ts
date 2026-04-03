import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/routes': 'http://localhost:8000',
      '/stars':  'http://localhost:8000',
      '/tiles':  'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
});
