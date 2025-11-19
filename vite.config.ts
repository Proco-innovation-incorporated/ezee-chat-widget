import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import DefineOptions from 'unplugin-vue-define-options/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const notProduction = mode !== 'production';

  let config = {
    plugins: [
      vue(),
      vueJsx(),
      DefineOptions(),
    ],
    css: {
      modules: {
        localsConvention: 'camelCase'
      },
    },
    build: {
      manifest: notProduction,
      sourcemap: notProduction ? 'inline' : false,
      minify: notProduction ? false : 'terser',
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          format: 'iife',
        },
      },
    },
    esbuild: {
      drop: notProduction ? [] : ['console', 'debugger'],
    },
  };

  if (notProduction) {
    console.log('config', JSON.stringify(config, null, 2));
  }

  return config;
});
