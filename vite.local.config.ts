import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      name: 'localize-html',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html
            .replace(/(<script\s+)type="module"\s*/g, '$1')
            .replace(/(<(?:script|link))\s+crossorigin(?:="[^"]*"|='[^']*')?([\s>])/g, '$1$2')
            .replace(/(<(?:script|link)[^>]+)\s+crossorigin(?:="[^"]*"|='[^']*')?([\s>])/g, '$1$2')
        },
      },
      generateBundle(_, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.fileName.endsWith('.html') && 'source' in chunk) {
            let html = chunk.source as string
            const scriptStart = html.indexOf('<script>')
            const scriptEnd = html.indexOf('</script>') + '</script>'.length
            if (scriptStart !== -1 && scriptEnd !== -1) {
              const scriptTag = html.slice(scriptStart, scriptEnd)
              html = html.slice(0, scriptStart) + html.slice(scriptEnd)
              const bodyEnd = html.lastIndexOf('</body>')
              if (bodyEnd !== -1) {
                html = html.slice(0, bodyEnd) + scriptTag + '\n  </body>' + html.slice(bodyEnd + 7)
              }
            }
            chunk.source = html
          }
        }
      },
    },
  ],
  base: './',
  build: {
    outDir: 'opencode-test/dist/local',
  },
})
