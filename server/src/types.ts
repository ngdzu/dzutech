export type SocialLinks = {
  linkedin: string
  github: string
  x: string
}

export type Profile = {
  name: string
  title: string
  tagline: string
  summary: string
  location: string
  email: string
  social: SocialLinks
}

export type Experience = {
  role: string
  company: string
  period: string
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
  href: string
  summary: string
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
  about: SectionDetails
  contact: SectionDetails
}

export type SiteMeta = {
  title: string
  description: string
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
