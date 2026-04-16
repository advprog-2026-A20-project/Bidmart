import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './style.css'

const root = createRoot(document.querySelector('#app'))

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
