import { renderMarkdown } from './lib/markdown'

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

export type Education = {
  institution: string
  degree?: string
  year?: string
  description?: string
}

export type SectionsContent = {
  contact: SectionDetails
  experiencesPage?: {
    visible: boolean
  }
  educations?: {
    visible: boolean
    items: Education[]
  }
  programmingLanguages?: {
    visible: boolean
    items: string[]
  }
  languagesSpoken?: {
    visible: boolean
    items: string[]
  }
  achievements?: {
    visible: boolean
    items: string[]
  }
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

export const defaultContent: ContentState = {
  site: {
    title: 'Crafted Portfolio',
    description: 'Showcase engineering work, thoughtful processes, and ways to collaborate.',
    homeButtonMode: 'text',
    logo: null,
  },
  profile: {
    name: 'Your Name',
    title: 'Software Engineer',
    tagline: 'I build reliable digital products with thoughtful, human-centered experiences.',
    summary:
      'I help product teams design, ship, and scale resilient web applications across the stack.',
    location: 'Remote · Worldwide',
    email: 'hello@example.com',
    social: {
      linkedin: 'https://www.linkedin.com/in/your-profile',
      github: 'https://github.com/your-handle',
    },
    contactVisibility: {
      email: true,
      linkedin: true,
      github: true,
    },
    highlightsEnabled: true,
    availability: {
      value: 'Open to mentoring & advisory work',
      enabled: true,
    },
    focusAreas: {
      value: 'Platform architecture · Developer experience · Applied AI',
      enabled: true,
    },
  },
  experiences: [
    {
      role: 'Principal Software Engineer',
      company: 'Aurora Labs',
      year: '2023 — Present',
      description:
        'Leading platform initiatives that help cross-functional teams ship reliably and iterate faster.',
      achievements: [
        'Designed a modular platform architecture that cut feature lead time by 45%.',
        'Introduced observability practices that increased incident detection accuracy to 99%.',
        'Mentored engineers and established guilds focused on frontend craft and platform stability.',
      ],
      stack: ['TypeScript', 'React', 'GraphQL', 'Node.js', 'AWS', 'Kubernetes'],
      location: 'Seattle, WA',
    },
    {
      role: 'Staff Software Engineer',
      company: 'Orbit Systems',
      year: '2020 — 2023',
      description:
        'Shipped mission-critical control interfaces used by globally distributed operations teams.',
      achievements: [
        'Rebuilt telemetry dashboards delivering sub-second insights to operators across continents.',
        'Implemented event-driven data pipelines that reduced mean-time-to-recovery by 35%.',
        'Partnered with product and design to align quarterly roadmaps and KPIs.',
      ],
      stack: ['React', 'Node.js', 'Rust', 'gRPC', 'Azure'],
      location: 'San Francisco, CA',
    },
    {
      role: 'Senior Software Engineer',
      company: 'Lumen Collective',
      year: '2016 — 2020',
      description:
        'Guided the build-out of a consumer fintech platform from seed stage through rapid growth.',
      achievements: [
        'Scaled real-time payment services to support 10x growth with zero downtime releases.',
        'Led cross-functional squads delivering features to millions of users with a focus on accessibility and trust.',
        'Established automated quality gates and observability practices adopted across the engineering org.',
      ],
      stack: ['React Native', 'TypeScript', 'Node.js', 'PostgreSQL', 'Terraform'],
      location: 'Remote',
    },
  ],
  posts: [
    {
      id: 'post-designing-guardrails',
      title: 'Designing Guardrails for AI-Assisted Coding Teams',
      content:
        '# Trust, Automation, and Guardrails\n\nShipping with AI copilots requires clear human guardrails. This post walks through the guiding principles, review rituals, and partnership agreements I use with product and design to keep code reviews fast without sacrificing trust.\n\n## What you will learn\n\n- Setting confidence thresholds that keep reviewers focused on critical diffs\n- Lightweight audit trails that satisfy compliance without slowing delivery\n- Coaching teams on when to lean on automation versus deep architectural thinking',
      tags: ['AI', 'Productivity', 'Leadership'],
      hidden: false,
    },
    {
      id: 'post-modern-observability',
      title: 'Modern Observability in a Polyglot Stack',
      content:
        '# Unifying Telemetry without Losing Your Mind\n\nUnifying telemetry across Node.js services, Rust workers, and serverless glue code can feel like herding cats. I share the dashboards, sampling strategies, and alerting heuristics that kept our operators confident while latency stayed predictable.\n\n> Great observability is less about the tools you buy and more about the habits you reinforce.\n\n### Highlights\n\n1. Tracing and structured logging for hybrid workloads\n2. Alerting heuristics that reduce noisy incidents\n3. Incident retro templates teams can adopt this quarter',
      tags: ['Observability', 'DevOps'],
      hidden: false,
    },
    {
      id: 'post-scaling-frontend-platforms',
      title: 'Scaling Frontend Platforms with Micro-Frontends',
      content:
        '# Micro-Frontends That Don\'t Fracture the UX\n\nWhen design systems and product squads both need to ship quickly, micro-frontends can help—if you invest in tooling and guardrails. I cover the architectural patterns, CI safeguards, and DX improvements that let us scale to dozens of teams without fracturing the user experience.\n\n```sh\npnpm dlx turbo run lint test build --filter="web..."\n```\n\nExpect deployment pipelines, shared contract testing, and a few lessons learned the hard way.',
      tags: ['Frontend', 'Architecture'],
      hidden: false,
    },
  ].map((post) => ({
    ...post,
    contentHtml: renderMarkdown(post.content),
  })),

  sections: {
    contact: {
      description:
        'I partner with founders, product leaders, and engineering teams to untangle complex systems, accelerate delivery, and coach developers. Drop a note and let’s explore how we can collaborate.',
    },
    experiencesPage: { visible: true },
    educations: { visible: true, items: [] },
    programmingLanguages: { visible: true, items: [] },
    languagesSpoken: { visible: true, items: [] },
    achievements: { visible: true, items: [] },
  },
}

export const profile = defaultContent.profile
export const experiences = defaultContent.experiences
export const posts = defaultContent.posts
export const sections = defaultContent.sections
