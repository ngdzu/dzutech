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

export const defaultContent: ContentState = {
  site: {
    title: 'Crafted Portfolio',
    description: 'Showcase engineering work, thoughtful processes, and ways to collaborate.',
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
      x: 'https://x.com/your-handle',
    },
  },
  experiences: [
    {
      role: 'Principal Software Engineer',
      company: 'Aurora Labs',
      period: '2023 — Present',
      description:
        'Leading platform initiatives that help cross-functional teams ship reliably and iterate faster.',
      achievements: [
        'Designed a modular platform architecture that cut feature lead time by 45%.',
        'Introduced observability practices that increased incident detection accuracy to 99%.',
        'Mentored engineers and established guilds focused on frontend craft and platform stability.',
      ],
      stack: ['TypeScript', 'React', 'GraphQL', 'Node.js', 'AWS', 'Kubernetes'],
    },
    {
      role: 'Staff Software Engineer',
      company: 'Orbit Systems',
      period: '2020 — 2023',
      description:
        'Shipped mission-critical control interfaces used by globally distributed operations teams.',
      achievements: [
        'Rebuilt telemetry dashboards delivering sub-second insights to operators across continents.',
        'Implemented event-driven data pipelines that reduced mean-time-to-recovery by 35%.',
        'Partnered with product and design to align quarterly roadmaps and KPIs.',
      ],
      stack: ['React', 'Node.js', 'Rust', 'gRPC', 'Azure'],
    },
    {
      role: 'Senior Software Engineer',
      company: 'Lumen Collective',
      period: '2016 — 2020',
      description:
        'Guided the build-out of a consumer fintech platform from seed stage through rapid growth.',
      achievements: [
        'Scaled real-time payment services to support 10x growth with zero downtime releases.',
        'Led cross-functional squads delivering features to millions of users with a focus on accessibility and trust.',
        'Established automated quality gates and observability practices adopted across the engineering org.',
      ],
      stack: ['React Native', 'TypeScript', 'Node.js', 'PostgreSQL', 'Terraform'],
    },
  ],
  usefulLinks: [
    {
      label: 'Engineering Playbook — How I lead teams',
      href: 'https://example.com/engineering-playbook.pdf',
      description: 'The rituals, principles, and frameworks I rely on to keep teams aligned and shipping.',
    },
    {
      label: 'System Design Cheatsheets',
      href: 'https://example.com/system-design.pdf',
      description: 'A curated set of diagrams and heuristics I share with mentees preparing for interviews.',
    },
    {
      label: 'Developer Tooling Starter Kit',
      href: 'https://example.com/tooling-kit',
      description: 'Opinionated starter configs for linters, CI, and quality gates to spin projects up fast.',
    },
  ],
  posts: [
    {
      title: 'Designing Guardrails for AI-Assisted Coding Teams',
      href: 'https://blog.example.com/ai-guardrails',
      summary: 'A practical framework for weaving human oversight into AI-assisted developer workflows.',
      tags: ['AI', 'Productivity', 'Leadership'],
    },
    {
      title: 'Modern Observability in a Polyglot Stack',
      href: 'https://blog.example.com/observability-polyglot',
      summary: 'Lessons from unifying telemetry across Node.js, Rust, and serverless workloads.',
      tags: ['Observability', 'DevOps'],
    },
    {
      title: 'Scaling Frontend Platforms with Micro-Frontends',
      href: 'https://blog.example.com/micro-frontends-at-scale',
      summary: 'Patterns that helped us grow a design system and shipping velocity without slowing teams down.',
      tags: ['Frontend', 'Architecture'],
    },
  ],
  tutorials: [
    {
      title: 'Getting Started with Event-Driven React Apps',
      href: 'https://learn.example.com/event-driven-react',
      duration: '30 min video',
    },
    {
      title: 'Terraform Modules That Scale with Teams',
      href: 'https://learn.example.com/terraform-modules',
      duration: 'Crash course',
    },
    {
      title: 'Observability 101 for Product Engineers',
      href: 'https://learn.example.com/observability-basics',
      duration: 'Hands-on lab',
    },
  ],
  sections: {
    about: {
      description:
        'I thrive at the intersection of product vision and engineering execution. I love mentoring builders, crafting ambitious roadmaps, and pairing on architectural deep dives.',
    },
    contact: {
      description:
        'I partner with founders, product leaders, and engineering teams to untangle complex systems, accelerate delivery, and coach developers. Drop a note and let’s explore how we can collaborate.',
    },
  },
}

export const profile = defaultContent.profile
export const experiences = defaultContent.experiences
export const usefulLinks = defaultContent.usefulLinks
export const posts = defaultContent.posts
export const tutorials = defaultContent.tutorials
export const sections = defaultContent.sections
