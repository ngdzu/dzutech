import type { ContentState } from './types.js'

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
    contact: {
      description:
        'I partner with founders, product leaders, and engineering teams to untangle complex systems, accelerate delivery, and coach developers. Drop a note and let’s explore how we can collaborate.',
    },
  },
}
