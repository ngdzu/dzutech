import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminSessionActions } from '../components/AdminSessionActions'
import { fieldStyle, labelStyle, createEmptyExperience, parseAchievements, parseStack } from '../lib/adminHelpers'
import { FiTrash2 } from 'react-icons/fi'
import type { ExperienceFormEntry } from '../lib/adminHelpers'

const AdminExperiencesPage = () => {
    const { content, updateExperiences } = useContent()
    const { experiences } = content
    const { sections } = content
    const { updateSections } = useContent()

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

    const sectionsInitialForm = useMemo(
        () => ({
            contactDescription: sections.contact?.description ?? '',
            experiencesVisible: sections.experiencesPage?.visible ?? true,
            educationsVisible: sections.educations?.visible ?? true,
            educationsItems: (sections.educations?.items ?? []).map((e) => ({ ...e })),
            programmingLanguagesVisible: sections.programmingLanguages?.visible ?? true,
            programmingLanguagesItems: (sections.programmingLanguages?.items ?? []).slice(),
            languagesSpokenVisible: sections.languagesSpoken?.visible ?? true,
            languagesSpokenItems: (sections.languagesSpoken?.items ?? []).slice(),
            achievementsVisible: sections.achievements?.visible ?? true,
            achievementsItems: (sections.achievements?.items ?? []).slice(),
        }),
        [sections],
    )

    type SectionsFormState = {
        contactDescription: string
        experiencesVisible: boolean
        educationsVisible: boolean
        educationsItems: { institution: string; degree?: string; year?: string; description?: string }[]
        programmingLanguagesVisible: boolean
        programmingLanguagesItems: string[]
        languagesSpokenVisible: boolean
        languagesSpokenItems: string[]
        achievementsVisible: boolean
        achievementsItems: string[]
    }

    const [sectionsForm, setSectionsForm] = useState<SectionsFormState>(sectionsInitialForm as unknown as SectionsFormState)

    // Local raw input for programming languages so typing commas is preserved
    const [programmingLanguagesRaw, setProgrammingLanguagesRaw] = useState<string>('')
    // Local raw input for human languages (single string saved/displayed as entered)
    const [languagesSpokenRaw, setLanguagesSpokenRaw] = useState<string>('')

    useEffect(() => {
        setSectionsForm(sectionsInitialForm as unknown as SectionsFormState)
    }, [sectionsInitialForm])

    // initialize/sync the raw input when sections form changes (e.g., load)
    useEffect(() => {
        setProgrammingLanguagesRaw(((sectionsInitialForm as unknown as SectionsFormState).programmingLanguagesItems ?? []).join(', '))
    }, [sectionsInitialForm])
    useEffect(() => {
        setLanguagesSpokenRaw(((sectionsInitialForm as unknown as SectionsFormState).languagesSpokenItems ?? []).join(', '))
    }, [sectionsInitialForm])

    const updateSectionsFormField = <T extends keyof SectionsFormState>(prev: SectionsFormState, field: T, value: SectionsFormState[T]): SectionsFormState => {
        return { ...prev, [field]: value } as SectionsFormState
    }

    type ArrayStringField = 'programmingLanguagesItems' | 'languagesSpokenItems' | 'achievementsItems'

    const handleToggle = (field: keyof SectionsFormState & string) => (event: ChangeEvent<HTMLInputElement>) => {
        setSectionsForm((prev) => updateSectionsFormField(prev, field as keyof SectionsFormState, event.target.checked as SectionsFormState[typeof field]))
    }

    const handleEditArrayItem = (field: ArrayStringField, index: number) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSectionsForm((prev) => {
            const arr = (prev[field] ?? []) as string[]
            const next = arr.slice()
            next[index] = event.target.value
            return updateSectionsFormField(prev, field as keyof SectionsFormState, next as SectionsFormState[typeof field])
        })
    }

    const handleEditEducation = (index: number, key: keyof (SectionsFormState['educationsItems'][number])) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSectionsForm((prev) => {
            const copy = { ...prev }
            const items = copy.educationsItems.slice()
            items[index] = { ...items[index], [key]: event.target.value }
            copy.educationsItems = items
            return copy
        })
    }

    type EducationItem = SectionsFormState['educationsItems'][number]

    const handleAddArrayItem = (field: keyof SectionsFormState & string, initial: EducationItem | string = '') => () => {
        setSectionsForm((prev) => {
            if (field === 'educationsItems') {
                const items = ((prev.educationsItems ?? []) as SectionsFormState['educationsItems']).slice()
                items.push(initial as EducationItem)
                return updateSectionsFormField(prev, 'educationsItems', items as SectionsFormState['educationsItems'])
            }
            const arr = (prev[field as keyof SectionsFormState] ?? []) as string[]
            return updateSectionsFormField(prev, field as keyof SectionsFormState, [...arr, initial as string] as SectionsFormState[typeof field])
        })
    }

    const handleRemoveArrayItem = (field: keyof SectionsFormState & string, index: number) => () => {
        setSectionsForm((prev) => {
            if (field === 'educationsItems') {
                const items = ((prev.educationsItems ?? []) as SectionsFormState['educationsItems']).slice()
                items.splice(index, 1)
                return updateSectionsFormField(prev, 'educationsItems', items as SectionsFormState['educationsItems'])
            }
            const arr = ((prev[field as keyof SectionsFormState] ?? []) as string[]).slice()
            arr.splice(index, 1)
            return updateSectionsFormField(prev, field as keyof SectionsFormState, arr as SectionsFormState[typeof field])
        })
    }

    const handleSectionsSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const nextSections = {
            contact: { description: sectionsForm.contactDescription.trim() },
            experiencesPage: { visible: Boolean(sectionsForm.experiencesVisible) },
            educations: { visible: Boolean(sectionsForm.educationsVisible), items: (sectionsForm.educationsItems ?? []).map((e) => ({ institution: (e.institution ?? '').trim(), degree: (e.degree ?? '').trim(), year: (e.year ?? '').trim(), description: (e.description ?? '').trim() })) },
            programmingLanguages: { visible: Boolean(sectionsForm.programmingLanguagesVisible), items: (sectionsForm.programmingLanguagesItems ?? []).map((s) => (s ?? '').trim()).filter(Boolean) },
            languagesSpoken: { visible: Boolean(sectionsForm.languagesSpokenVisible), items: (sectionsForm.languagesSpokenItems ?? []).map((s) => (s ?? '').trim()).filter(Boolean) },
            achievements: { visible: Boolean(sectionsForm.achievementsVisible), items: (sectionsForm.achievementsItems ?? []).map((s) => (s ?? '').trim()).filter(Boolean) },
        }

        try {
            await updateSections(nextSections)
            // show simple feedback in experiencesStatus
            setExperiencesStatus({ state: 'saved' })
            setTimeout(() => setExperiencesStatus({ state: 'idle' }), 2000)
        } catch (err) {
            setExperiencesStatus({ state: 'error', message: err instanceof Error ? err.message : 'Failed to save sections' })
        }
    }

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

                                <div className="grid gap-4 md:grid-cols-4">
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
                                    <label className="flex flex-col gap-2 md:col-span-1">
                                        <span className={labelStyle}>Location</span>
                                        <input className={fieldStyle} value={experience.location} onChange={handleExperienceTextChange(index, 'location')} placeholder="Remote / City" />
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

                <form onSubmit={handleSectionsSubmit} className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 scroll-mt-28">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-white">Education and more</h2>
                        <p className="text-sm text-slate-400">Control the content blocks shown on the experiences page: education, programming languages, languages spoken, and achievements.</p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Experiences page</p>
                                <p className="text-xs text-slate-500">Show or hide the dedicated experiences page</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                                <input type="checkbox" className="h-4 w-4" checked={sectionsForm.experiencesVisible} onChange={handleToggle('experiencesVisible')} />
                                <span>{sectionsForm.experiencesVisible ? 'Visible' : 'Hidden'}</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Education</p>
                                <p className="text-xs text-slate-500">List of degrees or certificates to show on experiences page</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                                <input type="checkbox" className="h-4 w-4" checked={sectionsForm.educationsVisible} onChange={handleToggle('educationsVisible')} />
                                <span>{sectionsForm.educationsVisible ? 'Visible' : 'Hidden'}</span>
                            </label>
                        </div>
                        <div className="space-y-3">
                            {(sectionsForm.educationsItems ?? []).map((edu, idx: number) => (
                                <div key={`edu-${idx}`} className="space-y-2">
                                    <div className="grid gap-2 md:grid-cols-3">
                                        <input className={fieldStyle} value={edu.institution ?? ''} onChange={handleEditEducation(idx, 'institution')} placeholder="Institution" />
                                        <input className={fieldStyle} value={edu.degree ?? ''} onChange={handleEditEducation(idx, 'degree')} placeholder="Degree" />
                                        <input className={fieldStyle} value={edu.year ?? ''} onChange={handleEditEducation(idx, 'year')} placeholder="Year" />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <textarea className={`${fieldStyle} min-h-[64px] w-full`} value={edu.description ?? ''} onChange={handleEditEducation(idx, 'description')} placeholder="Description" />
                                        <button
                                            type="button"
                                            aria-label={`Delete education ${idx + 1}`}
                                            onClick={() => {
                                                const hasContent = Boolean((edu.institution ?? '').trim() || (edu.degree ?? '').trim() || (edu.year ?? '').trim() || (edu.description ?? '').trim())
                                                if (hasContent) {
                                                    if (!window.confirm('This education entry contains data. Are you sure you want to remove it?')) return
                                                }
                                                handleRemoveArrayItem('educationsItems', idx)()
                                            }}
                                            className="inline-flex items-center gap-2 rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/70 hover:text-red-100"
                                        >
                                            <FiTrash2 />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <button type="button" onClick={handleAddArrayItem('educationsItems', { institution: '', degree: '', year: '', description: '' })} className="rounded-full border px-3 py-1 text-sm">Add education</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Programming languages</p>
                                <p className="text-xs text-slate-500">Languages & runtimes to display</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                                <input type="checkbox" className="h-4 w-4" checked={sectionsForm.programmingLanguagesVisible} onChange={handleToggle('programmingLanguagesVisible')} />
                                <span>{sectionsForm.programmingLanguagesVisible ? 'Visible' : 'Hidden'}</span>
                            </label>
                        </div>
                        <div className="space-y-2">
                            <label className="flex flex-col gap-2">
                                <span className={labelStyle}>Languages (comma separated)</span>
                                <input
                                    className={fieldStyle}
                                    value={programmingLanguagesRaw}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setProgrammingLanguagesRaw(val)
                                        const items = val
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean)
                                        setSectionsForm((prev) => updateSectionsFormField(prev, 'programmingLanguagesItems', items as SectionsFormState['programmingLanguagesItems']))
                                    }}
                                    placeholder="JavaScript, TypeScript, Go"
                                />
                            </label>

                            <div className="flex flex-wrap gap-2 mt-2">
                                {(sectionsForm.programmingLanguagesItems ?? []).map((lang: string) => (
                                    <span key={lang} className="rounded-full border border-slate-800/60 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">{lang}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Languages spoken</p>
                                <p className="text-xs text-slate-500">Enter a comma-separated list</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                                <input type="checkbox" className="h-4 w-4" checked={sectionsForm.languagesSpokenVisible} onChange={handleToggle('languagesSpokenVisible')} />
                                <span>{sectionsForm.languagesSpokenVisible ? 'Visible' : 'Hidden'}</span>
                            </label>
                        </div>
                        <div className="space-y-2">
                            <label className="flex flex-col gap-2">
                                <input
                                    className={fieldStyle}
                                    value={languagesSpokenRaw}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setLanguagesSpokenRaw(val)
                                        // store as a single-item array so server shape remains consistent
                                        setSectionsForm((prev) => updateSectionsFormField(prev, 'languagesSpokenItems', [val]))
                                    }}
                                    placeholder="English, Vietnamese"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-night-900/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Achievements</p>
                                <p className="text-xs text-slate-500">Bulleted achievements to show on experiences page</p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                                <input type="checkbox" className="h-4 w-4" checked={sectionsForm.achievementsVisible} onChange={handleToggle('achievementsVisible')} />
                                <span>{sectionsForm.achievementsVisible ? 'Visible' : 'Hidden'}</span>
                            </label>
                        </div>
                        <div className="space-y-2">
                            {(sectionsForm.achievementsItems ?? []).map((a: string, idx: number) => (
                                <div key={`ach-${idx}`} className="flex gap-2">
                                    <input className={fieldStyle} value={a} onChange={handleEditArrayItem('achievementsItems', idx)} />
                                    <button type="button" onClick={handleRemoveArrayItem('achievementsItems', idx)} className="rounded-full border px-3 py-1 text-sm">Remove</button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <button type="button" onClick={handleAddArrayItem('achievementsItems', '')} className="rounded-full border px-3 py-1 text-sm">Add achievement</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">Changes are saved to the server and immediately reflected on the experiences page.</div>
                        <div className="flex gap-3">
                            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400">Save sections</button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    )
}

export { AdminExperiencesPage }
