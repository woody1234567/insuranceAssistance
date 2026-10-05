import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        // 前端呼叫 /api/v1/... 時，轉發到後端
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "https://insurancebackend.zeabur.app",
          changeOrigin: true,
        },
      },
    },
  };
});

