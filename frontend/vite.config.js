import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 前端呼叫 /api/v1/... 時，轉發到 Zeabur 上的後端
      "/api": {
        target: "https://insurancebackend.zeabur.app",
        changeOrigin: true,
      },
    },
  },
});
