import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useToast, ToastContainer } from '../shared/Toast'
import { createContext, useContext, useState } from 'react'

const ToastCtx = createContext(null)
export const useAppToast = () => useContext(ToastCtx) ?? (() => {})

export default function AppShell() {
  const { toasts, show } = useToast()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <ToastCtx.Provider value={show}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </ToastCtx.Provider>
  )
}
