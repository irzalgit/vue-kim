import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Tambahkan basename="/vue-kim" sesuai dengan sub-path Vite kamu
  <BrowserRouter basename="/vue-kim"> 
    <App />
  </BrowserRouter>
)
