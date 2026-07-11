import {defineConfig}from'vite'
import react from'@vitejs/plugin-react'
import path from'path'

export default defineConfig({
  base:'/watermark-editor/',
  plugins:[react()],
  build:{
    rollupOptions:{
      input:{
        main:path.resolve(__dirname,'index.html'),
        diesel:path.resolve(__dirname,'diesel.html'),
      }
    }
  }
})