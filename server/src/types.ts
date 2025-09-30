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
}

export type ResourceLink = {
  label: string
  href: string
  description: string
}

export type Post = {
  title: string
  content: string
  tags: string[]
}

export type Tutorial = {
  title: string
  href: string
  duration: string
}

export type SectionDetails = {
  description: string
}

export type SectionsContent = {
  contact: SectionDetails
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
  usefulLinks: ResourceLink[]
  posts: Post[]
  tutorials: Tutorial[]
  sections: SectionsContent
}
