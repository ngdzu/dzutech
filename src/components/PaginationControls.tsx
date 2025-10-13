import { useState } from 'react'

type Props = {
  totalItems: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
}

const PaginationControls = ({ totalItems, pageSize, currentPage, onPageChange }: Props) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const [jump, setJump] = useState<string>('')

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page))
    if (clamped !== currentPage) onPageChange(clamped)
  }

  return (
    <div className="flex items-center gap-3">
      {/* match other site buttons: rounded-full, border, slate colors, hover accent */}
      {/** Small variant */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          First
        </button>
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Prev
        </button>
      </div>

      <span className="text-sm">
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => goTo(totalPages)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>

      <div className="ml-3 flex items-center gap-2">
        <label className="text-sm">Go to</label>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          className="w-20 rounded-full border border-slate-700/70 px-3 py-1 text-sm bg-transparent text-slate-200"
        />
        <button
          type="button"
          onClick={() => {
            const v = Number(jump)
            if (!Number.isFinite(v) || v <= 0) return
            goTo(v)
            setJump('')
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Go
        </button>
      </div>
    </div>
  )
}

export default PaginationControls
