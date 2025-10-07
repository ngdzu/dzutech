import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminSessionActions } from '../components/AdminSessionActions'
import { fieldStyle, labelStyle, createEmptyExperience, parseAchievements, parseStack } from '../lib/adminHelpers'
import type { ExperienceFormEntry } from '../lib/adminHelpers'

const AdminExperiencesPage = () => {
    const { content, updateExperiences } = useContent()
    const { experiences } = content

    const experiencesInitialForm = useMemo<ExperienceFormEntry[]>(() => {
        if (experiences.length === 0) return [createEmptyExperience()]
        return experiences.map((experience) => ({
            role: experience.role,
            company: experience.company,
            year: experience.year,
            description: experience.description,
            achievementsInput: experience.achievements.join('\n'),
            stackInput: experience.stack.join(', '),
            location: experience.location ?? '',
        }))
    }, [experiences])

    const [experiencesForm, setExperiencesForm] = useState<ExperienceFormEntry[]>(experiencesInitialForm)
    const [experiencesStatus, setExperiencesStatus] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ state: 'idle' })

    useEffect(() => setExperiencesForm(experiencesInitialForm), [experiencesInitialForm])

    const handleExperienceTextChange = (
        index: number,
        field: 'role' | 'company' | 'year' | 'description' | 'location',
    ) =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = event.target.value
            setExperiencesForm((prev) => prev.map((experience, currentIndex) => (currentIndex === index ? { ...experience, [field]: value } : experience)))
            setExperiencesStatus({ state: 'idle' })
        }

    const handleExperienceAchievementsChange = (index: number) => (event: ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value
        setExperiencesForm((prev) => prev.map((experience, currentIndex) => (currentIndex === index ? { ...experience, achievementsInput: value } : experience)))
        setExperiencesStatus({ state: 'idle' })
    }

    const handleExperienceStackChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setExperiencesForm((prev) => prev.map((experience, currentIndex) => (currentIndex === index ? { ...experience, stackInput: value } : experience)))
        setExperiencesStatus({ state: 'idle' })
    }

    const handleAddExperience = () => {
        setExperiencesForm((prev) => [...prev, createEmptyExperience()])
        setExperiencesStatus({ state: 'idle' })
    }

    const handleRemoveExperience = (index: number) => () => {
        setExperiencesForm((prev) => {
            if (prev.length <= 1) return [createEmptyExperience()]
            return prev.filter((_, currentIndex) => currentIndex !== index)
        })
        setExperiencesStatus({ state: 'idle' })
    }

    const handleExperiencesSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setExperiencesStatus({ state: 'saving' })

        const sanitized = experiencesForm.map((experience) => ({
            role: experience.role.trim(),
            company: experience.company.trim(),
            year: experience.year.trim(),
            location: (experience.location ?? '').trim(),
            description: experience.description.trim(),
            achievements: parseAchievements(experience.achievementsInput),
            stack: parseStack(experience.stackInput),
        }))

        if (sanitized.length === 0) {
            setExperiencesStatus({ state: 'error', message: 'Add at least one experience before saving' })
            return
        }

        const invalidIndex = sanitized.findIndex((experience) => {
            if (!experience.year || !experience.role || !experience.company) return true
            if (!experience.description) return true
            if (experience.stack.length === 0) return true
            return false
        })

        if (invalidIndex !== -1) {
            const displayIndex = invalidIndex + 1
            setExperiencesStatus({ state: 'error', message: `Experience ${displayIndex} needs a year, title, company, description, and at least one skill chip` })
            return
        }

        try {
            const saved = await updateExperiences(sanitized)
            setExperiencesForm(
                saved.map((experience) => ({
                    role: experience.role,
                    company: experience.company,
                    year: experience.year,
                    description: experience.description,
                    achievementsInput: experience.achievements.join('\n'),
                    stackInput: experience.stack.join(', '),
                    location: experience.location ?? '',
                })),
            )
            setExperiencesStatus({ state: 'saved' })
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Failed to save experiences'
            setExperiencesStatus({ state: 'error', message })
        }
    }

    return (
        <div className="min-h-screen bg-night-900 text-slate-100">
            <header className="border-b border-white/5 bg-night-900/80">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 pt-3 pb-6">
                    <div className="flex justify-end">
                        <AdminSessionActions />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-white">Experience management</h1>
                            <p className="text-sm text-slate-400">Edit the experiences shown on the landing page.</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-3">
                            <Link
                                to="/admin"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                            >
                                Back to dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
                <form onSubmit={handleExperiencesSubmit} className="space-y-6">
                    {experiencesForm.map((experience, index) => {
                        const stackItems = experience.stackInput
                            .split(',')
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0)

                        return (
                            <div key={`experience-${index}`} className="space-y-5 rounded-2xl border border-slate-800/70 bg-night-900/50 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-semibold text-white">Experience {index + 1}</h3>
                                        <p className="text-xs text-slate-500">Showcase a role and the stack you led or contributed to during that time.</p>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveExperience(index)} className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-red-400/60 hover:text-red-200">
                                        Remove
                                    </button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <label className="flex flex-col gap-2 md:col-span-1">
                                        <span className={labelStyle}>Year</span>
                                        <input className={fieldStyle} value={experience.year} onChange={handleExperienceTextChange(index, 'year')} placeholder="2023 — Present" />
                                    </label>
                                    <label className="flex flex-col gap-2 md:col-span-1">
                                        <span className={labelStyle}>Title</span>
                                        <input className={fieldStyle} value={experience.role} onChange={handleExperienceTextChange(index, 'role')} placeholder="Principal Software Engineer" />
                                    </label>
                                    <label className="flex flex-col gap-2 md:col-span-1">
                                        <span className={labelStyle}>Company</span>
                                        <input className={fieldStyle} value={experience.company} onChange={handleExperienceTextChange(index, 'company')} placeholder="Aurora Labs" />
                                    </label>
                                </div>

                                <label className="flex flex-col gap-2">
                                    <span className={labelStyle}>Description</span>
                                    <textarea className={`${fieldStyle} min-h-[120px]`} value={experience.description} onChange={handleExperienceTextChange(index, 'description')} />
                                </label>

                                {stackItems.length > 0 && (
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                        {stackItems.map((s) => (
                                            <span key={s} className="rounded-full border border-slate-800/60 bg-slate-900/70 px-3 py-1">{s}</span>
                                        ))}
                                    </div>
                                )}

                                <label className="flex flex-col gap-2">
                                    <span className={labelStyle}>Skills (comma separated)</span>
                                    <input className={fieldStyle} value={experience.stackInput} onChange={handleExperienceStackChange(index)} placeholder="React, TypeScript, GraphQL" />
                                </label>

                                <label className="flex flex-col gap-2">
                                    <span className={labelStyle}>Achievements (one per line)</span>
                                    <textarea className={`${fieldStyle} min-h-[80px]`} value={experience.achievementsInput} onChange={handleExperienceAchievementsChange(index)} />
                                </label>
                            </div>
                        )
                    })}

                    <div className="flex gap-3">
                        <button type="button" onClick={handleAddExperience} className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white">
                            Add experience
                        </button>
                        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400">
                            Save experiences
                        </button>
                    </div>

                    {experiencesStatus.state === 'error' && <p className="text-sm text-red-300">{experiencesStatus.message}</p>}
                    {experiencesStatus.state === 'saved' && <p className="text-sm text-emerald-300">Saved</p>}
                </form>
            </main>
        </div>
    )
}

export { AdminExperiencesPage }
