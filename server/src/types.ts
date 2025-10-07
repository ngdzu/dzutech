export type SocialLinks = {
  linkedin: string
  github: string
}

export type ContactVisibility = {
  email: boolean
  linkedin: boolean
  github: boolean
}

export type Profile = {
  name: string
  title: string
  tagline: string
  summary: string
  location: string
  email: string
  social: SocialLinks
  contactVisibility: ContactVisibility
  highlightsEnabled: boolean
  availability: ProfileHighlight
  focusAreas: ProfileHighlight
}

export type ProfileHighlight = {
  value: string
  enabled: boolean
}

export type Experience = {
  role: string
  company: string
  year: string
  description: string
  achievements: string[]
  stack: string[]
  location?: string
}

export type Post = {
  id: string
  title: string
  content: string
  contentHtml?: string
  tags: string[]
  hidden: boolean
  createdAt?: string
  updatedAt?: string
}


export type SectionDetails = {
  description: string
}

export type SectionsContent = {
  contact: SectionDetails
  experiencesPage?: { visible: boolean }
  educations?: { visible: boolean; items: { institution: string; degree?: string; year?: string; description?: string }[] }
  programmingLanguages?: { visible: boolean; items: string[] }
  languagesSpoken?: { visible: boolean; items: string[] }
  achievements?: { visible: boolean; items: string[] }
}

export type SiteLogo = {
  data: string
  type: string
  alt?: string
}

export type SiteMeta = {
  title: string
  description: string
  homeButtonMode: 'text' | 'logo'
  logo: SiteLogo | null
}

export type ContentState = {
  site: SiteMeta
  profile: Profile
  experiences: Experience[]
  posts: Post[]
  sections: SectionsContent
}
