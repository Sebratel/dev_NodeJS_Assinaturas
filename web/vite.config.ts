import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Bibliotecas grandes em pedaços próprios: ficam em cache entre deploys e nenhuma passa de 500 KB.
const VENDOR_GROUPS = [
  {
    name: 'vendor-react',
    test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
  },
  { name: 'vendor-firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/ },
  {
    name: 'vendor-editor-lang',
    test: /node_modules[\\/](@codemirror[\\/]lang-|@lezer[\\/](html|css|javascript))/,
  },
  {
    name: 'vendor-editor',
    test: /node_modules[\\/](@codemirror|@lezer|@uiw|codemirror|style-mod|w3c-keyname|crelt)[\\/]/,
  },
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3180' },
  },
  build: {
    rolldownOptions: {
      // Sem puxar dependências: senão o grupo das linguagens leva o núcleo do editor junto.
      output: {
        codeSplitting: {
          groups: VENDOR_GROUPS,
          includeDependenciesRecursively: false,
        },
      },
    },
  },
})
