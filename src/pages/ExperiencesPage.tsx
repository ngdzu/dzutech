import { useMemo, useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
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
    const { experiences, sections, site } = content

    const sectionsList = useMemo<NavSection[]>(() => [
        { id: 'experiences', label: 'Experiences' },
        { id: 'educations', label: 'Education' },
        { id: 'programming-languages', label: 'Programming languages' },
        { id: 'languages-spoken', label: 'Languages' },
        { id: 'achievements', label: 'Achievements' },
    ], [])

    const [activeSection, setActiveSection] = useState<string>(sectionsList[0]?.id ?? '')
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

    const siteTitle = site.title?.trim()
    const homeUsesLogo = site.homeButtonMode === 'logo' && Boolean(site.logo?.data)
    const homeLogoAlt = site.logo?.alt?.trim() || siteTitle || 'Home'
    const homeLinkClasses = homeUsesLogo
        ? 'inline-flex items-center gap-3 rounded-xl font-semibold text-white transition hover:text-accent-200'
        : 'inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white transition hover:text-accent-200'

    return (
        <div className="relative min-h-screen bg-night-900 text-slate-100">
            <header className="sticky top-0 z-50 border-b border-white/5 bg-night-900/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <Link to="/" className={homeLinkClasses} aria-label={homeUsesLogo ? homeLogoAlt : undefined}>
                        {homeUsesLogo && site.logo?.data ? (
                            <img src={site.logo.data} alt={homeLogoAlt} className="h-10 w-auto max-h-10 object-contain" />
                        ) : (
                            <>
                                {siteTitle ? siteTitle.toLowerCase() : 'home'}
                                <span className="text-accent-400">.</span>
                            </>
                        )}
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="flex gap-8">
                    <SideNav sections={sectionsList} activeSection={activeSection} />
                    <main className="flex-1">
                        <section id="experiences" className="scroll-mt-24 space-y-6">
                            <h2 className="text-3xl font-semibold text-white">Experiences</h2>
                            <div className="space-y-6">
                                {experiences.map((exp) => (
                                    <article key={`${exp.company}-${exp.role}`} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
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
                                        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                            {exp.stack.map((s) => (
                                                <li key={s} className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1">
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section id="educations" className="scroll-mt-24 space-y-6">
                            <h2 className="text-3xl font-semibold text-white">Education</h2>
                            <div className="space-y-4">
                                {(sections.educations?.items ?? []).map((edu, idx) => (
                                    <div key={idx} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                                        <h3 className="text-lg font-semibold text-white">
                                            {edu.institution}
                                            {edu.degree ? ` · ${edu.degree}` : ''}
                                        </h3>
                                        <p className="text-sm text-slate-400">{edu.year}</p>
                                        {edu.description && <p className="mt-2 text-slate-300">{edu.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section id="programming-languages" className="scroll-mt-24 space-y-6">
                            <h2 className="text-3xl font-semibold text-white">Programming languages</h2>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {(sections.programmingLanguages?.items ?? []).map((lang) => (
                                    <span key={lang} className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </section>

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

                        <section id="achievements" className="scroll-mt-24 space-y-6">
                            <h2 className="text-3xl font-semibold text-white">Achievements</h2>
                            <ul className="mt-3 space-y-2 list-disc pl-6 text-slate-300">
                                {(sections.achievements?.items ?? []).map((a) => (
                                    <li key={a}>{a}</li>
                                ))}
                            </ul>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    )
}

export default ExperiencesPage
