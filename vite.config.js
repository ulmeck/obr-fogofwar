import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    https: {
      cert: '/etc/letsencrypt/live/tiny.appin.org/fullchain.pem',
      key: '/etc/letsencrypt/live/tiny.appin.org/privkey.pem',
    }, 
     port: 443,
     cors: true,
     host: true,
 }
})
