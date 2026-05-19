import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/noto-sans-kr/300.css'
import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/500.css'
import '@fontsource/noto-sans-kr/700.css'
import '@fontsource/noto-serif-kr/400.css'
import '@fontsource/noto-serif-kr/700.css'
import './styles/globals.css'
import App from './App'

// macOS에서 백그라운드 복귀 시 GPU 컴포지터가 빈 프레임을 유지하는 경우 대비
// 창이 보이게 되는 순간 강제로 리페인트를 트리거한다.
const forceRepaint = (): void => {
  const root = document.documentElement
  root.style.transform = 'translateZ(0)'
  requestAnimationFrame(() => {
    root.style.transform = ''
  })
}
window.addEventListener('focus', forceRepaint)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') forceRepaint()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
