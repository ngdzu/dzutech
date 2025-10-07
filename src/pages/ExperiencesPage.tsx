import { useMemo, useEffect, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import Chip from '../components/Chip'
import { FiArrowLeft } from 'react-icons/fi'
import { useContent } from '../context/ContentContext'

type NavSection = { id: string; label: string }

const SideNav = ({ sections, activeSection }: { sections: NavSection[]; activeSection: string }) => {
    return (
        <nav className="lg:w-60 xl:w-64">
            <div className="sticky top-24 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Explore</p>
                <ul className="mt-4 space-y-2">
                    {sections.map(({ id, label }) => {
                        const isActive = activeSection === id
                        return (
                            <li key={id}>
                                <a
                                    href={`#${id}`}
                                    className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-accent-500/15 text-accent-200 shadow-glow' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
                                    aria-current={isActive ? 'true' : undefined}
                                >
                                    <span>{label}</span>
                                    <span
                                        className={`${isActive ? 'h-2 w-2 rounded-full bg-accent-400' : 'h-2 w-2 rounded-full bg-slate-700/80 group-hover:bg-slate-500'}`}
                                        aria-hidden
                                    />
                                </a>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </nav>
    )
}

const ExperiencesPage = () => {
    const { content } = useContent()
    const { experiences, sections } = content

    const sectionsList = useMemo<NavSection[]>(() => [
        { id: 'experiences', label: 'Experiences' },
        { id: 'educations', label: 'Education' },
        { id: 'programming-languages', label: 'Programming languages' },
        { id: 'languages-spoken', label: 'Languages' },
        { id: 'achievements', label: 'Achievements' },
    ], [])

    const [activeSection, setActiveSection] = useState<string>(sectionsList[0]?.id ?? '')
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const toggleExpanded = (key: string) => () => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
    }
    const location = useLocation()

    // Ensure we scroll to the top when navigating to this route so anchors / observer don't start mid-page
    useEffect(() => {
        if (typeof window === 'undefined') return
        window.scrollTo({ top: 0, left: 0 })
    }, [location.pathname])

    useEffect(() => {
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
                if (visible.length > 0) {
                    setActiveSection(visible[0].target.id)
                }
            },
            { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
        )

        sectionsList.forEach(({ id }) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [sectionsList])

    // Header uses shared blog-style header (Back + Home).

    const navigate = useNavigate()

    return (
        <div className="relative min-h-screen bg-night-900 text-slate-100">
            <header className="border-b border-white/5 bg-night-900/80">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
                    >
                        <FiArrowLeft />
                        Back
                    </button>
                    <Link
                        to="/#experiences"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                    >
                        Home
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="flex gap-8">
                    <SideNav sections={sectionsList} activeSection={activeSection} />
                    <main className="flex-1 space-y-16">
                        {sections.experiencesPage?.visible !== false && (
                            <section id="experiences" className="scroll-mt-24 space-y-6">
                                <h2 className="text-3xl font-semibold text-white">Experiences</h2>
                                <div className="space-y-6">
                                    {experiences.map((exp, idx) => {
                                        const key = `${exp.company}-${exp.role}-${idx}`
                                        const isExpanded = Boolean(expanded[key])
                                        const easingCollapse = "ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                                        const easingExpand = "ease-[cubic-bezier(0.22,1,0.36,1)]"
                                        const containerEasing = isExpanded ? easingExpand : easingCollapse
                                        const listEasing = isExpanded ? easingExpand : easingCollapse
                                        const chevronEasing = isExpanded ? easingExpand : easingCollapse
                                        // Durations: collapse uses original timings; expand is 3x slower
                                        const containerDuration = isExpanded ? 'duration-[1800ms]' : 'duration-[450ms]'
                                        const listDuration = isExpanded ? 'duration-[450ms]' : 'duration-[300ms]'
                                        const chevronDuration = isExpanded ? 'duration-[900ms]' : 'duration-[225ms]'
                                        return (
                                            <article key={key} className="relative rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{exp.year}</p>
                                                        <h3 className="mt-1 text-xl font-semibold text-white">
                                                            {exp.role} · <span className="text-accent-400">{exp.company}</span>
                                                        </h3>
                                                    </div>
                                                    {exp.location && <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{exp.location}</p>}
                                                </div>

                                                <p className="mt-3 text-slate-300">{exp.description}</p>

                                                {exp.achievements && exp.achievements.length > 0 && (
                                                    <div className={`mt-3 overflow-hidden transition-all ${containerDuration} ${containerEasing} ${isExpanded ? 'max-h-64' : 'max-h-0'}`}>
                                                        <ul className={`space-y-2 text-sm text-slate-300 transform transition-all ${listDuration} ${listEasing} ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                                                            {exp.achievements.map((a) => (
                                                                <li key={a} className="flex gap-3 items-start">
                                                                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                                                                    <span>{a}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <ul className="mt-3 mb-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                                    {exp.stack.map((s) => {
                                                        const trimmed = typeof s === 'string' ? s.trim() : ''
                                                        if (!trimmed) return null
                                                        const encoded = encodeURIComponent(trimmed.toLowerCase())
                                                        return (
                                                            <li key={trimmed}>
                                                                <Chip to={`/blogs/tags/${encoded}`}>{trimmed}</Chip>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>

                                                <div className="flex justify-center">
                                                    <button
                                                        type="button"
                                                        aria-expanded={isExpanded}
                                                        aria-label={isExpanded ? 'Collapse achievements' : 'Expand achievements'}
                                                        onClick={toggleExpanded(key)}
                                                        className="mt-2 mb-2 flex items-center justify-center w-full bg-transparent border-0 p-0 cursor-pointer group focus:outline-none"
                                                    >
                                                        <span className="inline-flex items-center justify-center h-6 w-6 text-accent-400 transition transform duration-150 group-hover:text-accent-200 group-hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400">
                                                            <svg
                                                                viewBox="0 0 20 20"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className={`h-5 w-5 transform ${isExpanded ? 'rotate-180' : ''} transition ${chevronDuration} ${chevronEasing}`}
                                                                aria-hidden
                                                            >
                                                                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    </button>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {sections.educations?.visible !== false && (
                            <section id="educations" className="scroll-mt-24 space-y-6">
                                <h2 className="text-3xl font-semibold text-white">Education</h2>
                                <div className="space-y-6">
                                    {(sections.educations?.items ?? []).map((edu, i) => (
                                        <article key={`${edu.institution}-${i}`} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
                                            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{edu.year}</p>
                                            <h3 className="mt-1 text-xl font-semibold text-white">
                                                {edu.institution}
                                                {edu.degree ? <span className="text-accent-400"> · {edu.degree}</span> : null}
                                            </h3>
                                            {edu.description && (
                                                <ul className="mt-3 space-y-2 text-slate-300">
                                                    {edu.description.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => (
                                                        <li key={line} className="flex gap-3 items-start text-sm">
                                                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                                                            <span>{line}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {sections.programmingLanguages?.visible !== false && (
                            <section id="programming-languages" className="scroll-mt-24 space-y-6">
                                <h2 className="text-3xl font-semibold text-white">Programming languages</h2>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {(sections.programmingLanguages?.items ?? []).map((lang) => {
                                        const trimmed = typeof lang === 'string' ? lang.trim() : ''
                                        if (!trimmed) return null
                                        const encoded = encodeURIComponent(trimmed.toLowerCase())
                                        return (
                                            <li key={trimmed} className="list-none">
                                                <Chip to={`/blogs/tags/${encoded}`}>{trimmed}</Chip>
                                            </li>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {sections.languagesSpoken?.visible !== false && (
                            <section id="languages-spoken" className="scroll-mt-24 space-y-6">
                                <h2 className="text-3xl font-semibold text-white">Languages</h2>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {(sections.languagesSpoken?.items ?? []).map((lang) => (
                                        <span key={lang} className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {sections.achievements?.visible !== false && (
                            <section id="achievements" className="scroll-mt-24 space-y-6">
                                <h2 className="text-3xl font-semibold text-white">Achievements</h2>
                                <ul className="mt-3 space-y-2 list-disc pl-6 text-slate-300">
                                    {(sections.achievements?.items ?? []).map((a) => (
                                        <li key={a}>{a}</li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}

export default ExperiencesPage
