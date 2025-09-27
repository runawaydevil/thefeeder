import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "0.0.0.0", // Accept connections from any IP
      port: parseInt(env.VITE_DEV_PORT) || 8693,
      proxy: {
        '/api/fever.php': {
          target: env.VITE_FRESHRSS_BASE_URL || 'https://rss.pablo.space',
          changeOrigin: true,
          secure: true,
          headers: {
            'User-Agent': `${env.VITE_APP_NAME || 'Pablo-Magazine'}/1.0`
          }
        }
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['better-sqlite3'],
    },
  };
});
