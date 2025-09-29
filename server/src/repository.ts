import { readJson, writeJson } from './db.js'
import { defaultContent } from './defaultContent.js'
import type {
  ContentState,
  Experience,
  Post,
  Profile,
  ResourceLink,
  SectionsContent,
  SiteMeta,
  Tutorial,
} from './types.js'

const CONTENT_KEYS: (keyof ContentState)[] = [
  'site',
  'profile',
  'experiences',
  'usefulLinks',
  'posts',
  'tutorials',
  'sections',
]

export const getContent = async (): Promise<ContentState> => {
  const content: ContentState = JSON.parse(JSON.stringify(defaultContent))
  for (const key of CONTENT_KEYS) {
    const value = await readJson<ContentState[typeof key]>(key)
    if (value !== undefined) {
      switch (key) {
        case 'site':
          content.site = value as ContentState['site']
          break
        case 'profile':
          content.profile = value as ContentState['profile']
          break
        case 'experiences':
          content.experiences = value as ContentState['experiences']
          break
        case 'usefulLinks':
          content.usefulLinks = value as ContentState['usefulLinks']
          break
        case 'posts':
          content.posts = value as ContentState['posts']
          break
        case 'tutorials':
          content.tutorials = value as ContentState['tutorials']
          break
        case 'sections':
          content.sections = value as ContentState['sections']
          break
      }
    }
  }
  return content
}

export const saveProfile = async (profile: Profile): Promise<Profile> => {
  await writeJson('profile', profile)
  return profile
}

export const saveSite = async (site: SiteMeta): Promise<SiteMeta> => {
  await writeJson('site', site)
  return site
}

export const saveExperiences = async (experiences: Experience[]): Promise<Experience[]> => {
  await writeJson('experiences', experiences)
  return experiences
}

export const saveUsefulLinks = async (links: ResourceLink[]): Promise<ResourceLink[]> => {
  await writeJson('usefulLinks', links)
  return links
}

export const savePosts = async (posts: Post[]): Promise<Post[]> => {
  await writeJson('posts', posts)
  return posts
}

export const saveTutorials = async (tutorials: Tutorial[]): Promise<Tutorial[]> => {
  await writeJson('tutorials', tutorials)
  return tutorials
}

export const saveSections = async (sections: SectionsContent): Promise<SectionsContent> => {
  await writeJson('sections', sections)
  return sections
}

export const resetContent = async (): Promise<ContentState> => {
  for (const key of CONTENT_KEYS) {
    await writeJson(key, defaultContent[key])
  }
  return JSON.parse(JSON.stringify(defaultContent))
}
