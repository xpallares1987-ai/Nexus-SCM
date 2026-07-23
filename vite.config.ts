/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Extract package name from node_modules path
              const match = id.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (!match) return 'vendor';
              
              const packageName = match[1];
              
              // Separate React core and routing to resolve circular chunk dependencies
              if (
                packageName === 'react' || 
                packageName === 'react-dom' || 
                packageName === 'scheduler' ||
                packageName === 'react-router'
              ) {
                return 'vendor-react';
              }
              
              // Separate PDF generation
              if (packageName.includes('jspdf')) {
                return 'vendor-pdf';
              }
              
              // Separate Charts & D3 (along with maps and topojson to avoid circular dependencies)
              if (
                packageName.includes('recharts') || 
                packageName.includes('d3') ||
                packageName.includes('react-simple-maps') ||
                packageName.includes('topojson')
              ) {
                return 'vendor-charts';
              }
              
              // All other third-party libraries go to the core vendor bundle
              return 'vendor-core';
            }
          }
        }
      }
    }
  };
});
