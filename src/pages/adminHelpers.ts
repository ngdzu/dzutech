export const fieldStyle =
    'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

export const labelStyle = 'text-sm font-medium text-slate-200'

export type ExperienceFormEntry = {
    role: string
    company: string
    year: string
    description: string
    achievementsInput: string
    stackInput: string
    location?: string | undefined
}

export const createEmptyExperience = (): ExperienceFormEntry => ({
    role: '',
    company: '',
    year: '',
    description: '',
    achievementsInput: '',
    stackInput: '',
    location: undefined,
})

export const parseAchievements = (input: string) =>
    input
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

export const parseStack = (input: string) =>
    input
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
