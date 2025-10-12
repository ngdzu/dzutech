import { Link } from 'react-router-dom'
import { AdminSessionActions } from './AdminSessionActions'

export const AdminHeader = () => {
  return (
    <header className="border-b border-white/5 bg-night-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
        >
          Admin dashboard
        </Link>
        <AdminSessionActions />
      </div>
    </header>
  )
}