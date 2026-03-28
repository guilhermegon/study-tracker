import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useToast, ToastContainer } from '../shared/Toast'
import { createContext, useContext } from 'react'

const ToastCtx = createContext(null)
export const useAppToast = () => useContext(ToastCtx) ?? (() => {})

export default function AppShell() {
  const { toasts, show } = useToast()

  return (
    <ToastCtx.Provider value={show}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </ToastCtx.Provider>
  )
}
