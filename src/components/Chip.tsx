import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ChipProps = {
    children: ReactNode
    to?: string
    onClick?: () => void
    ariaLabel?: string
    className?: string
}

export const Chip = ({ children, to, onClick, ariaLabel, className = '' }: ChipProps) => {
    const base = 'rounded-full border border-slate-800/60 bg-slate-900/70 px-3 py-1 text-xs transition'
    const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400'

    const interactive = Boolean((to && to.length > 0) || onClick)
    const interactiveClasses = interactive
        ? ' cursor-pointer hover:border-accent-400 hover:text-white hover:bg-slate-900/80'
        : ''

    const combined = `${base}${interactiveClasses} ${className} ${focus}`.trim()

    if (typeof to === 'string' && to.length > 0) {
        return (
            <Link to={to} className={combined} aria-label={ariaLabel}>
                {children}
            </Link>
        )
    }

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={combined} aria-label={ariaLabel}>
                {children}
            </button>
        )
    }

    return (
        <span className={combined} aria-label={ariaLabel}>
            {children}
        </span>
    )
}

export default Chip
