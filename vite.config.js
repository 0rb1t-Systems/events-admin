import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/js/src/main.tsx"],
            refresh: true,
        }),
        react(),
    ],

    // Windows: laravel-vite-plugin 1.3.0 crashes on .env-triggered restart when
    // httpServer.address() is null (typeof null === "object" then isIpv6 throws).
    // Pin IPv4 and ignore Laravel .env so Vite stays up; PHP already reloads env.
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,
        hmr: { host: "127.0.0.1" },
        watch: {
            ignored: ["**/.env"],
        },
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
