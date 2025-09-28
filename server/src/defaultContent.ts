import type { ContentState } from './types.js'

export const defaultContent: ContentState = {
  profile: {
    name: 'Dustin Zu',
    title: 'Senior Software Engineer',
    tagline: 'I design and ship resilient, cloud-native platforms that feel delightful to use.',
    summary:
      "I'm a full-stack engineer with over a decade of experience helping teams transform complex product ideas into elegant, scalable solutions.",
    location: 'San Francisco, CA',
    email: 'hello@dzutech.com',
    social: {
      linkedin: 'https://www.linkedin.com/in/dustinzu',
      github: 'https://github.com/dustinzu',
      x: 'https://x.com/dustinzu',
    },
  },
  experiences: [
    {
      role: 'Principal Software Engineer',
      company: 'NovaSphere Labs',
      period: '2023 — Present',
      description:
        'Leading a platform team that accelerates ML experimentation and deploys production-grade data services.',
      achievements: [
        'Architected a modular experimentation platform that cut model deployment time from weeks to hours.',
        'Standardized an event-driven microservice architecture across product lines, boosting reliability by 40%.',
        'Mentored engineers across the org, rolling out internal guilds for frontend craft and platform stability.',
      ],
      stack: ['TypeScript', 'React', 'GraphQL', 'Node.js', 'AWS', 'Kubernetes'],
    },
    {
      role: 'Staff Software Engineer',
      company: 'Orbital Systems',
      period: '2020 — 2023',
      description:
        'Shipped mission-critical control interfaces for satellite telemetry and planning teams.',
      achievements: [
        'Redesigned the telemetry dashboard, bringing sub-second insights to operators across 5 timezones.',
        'Introduced streaming data pipelines that slashed MTTR by 35% with predictive alerting.',
        'Partnered with product to align delivery cadence, establishing quarterly roadmap rituals and KPI reviews.',
      ],
      stack: ['React', 'Node.js', 'Rust', 'gRPC', 'Azure'],
    },
    {
      role: 'Senior Software Engineer',
      company: 'Lumen Collective',
      period: '2016 — 2020',
      description:
        'Guided the build-out of a consumer fintech mobile platform from seed stage through Series C.',
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
      href: 'https://dzutech.com/playbook.pdf',
      description: 'The rituals, principles, and frameworks I rely on to keep teams aligned and shipping.',
    },
    {
      label: 'System Design Cheatsheets',
      href: 'https://dzutech.com/system-design.pdf',
      description: 'A curated set of diagrams and heuristics I share with mentees preparing for interviews.',
    },
    {
      label: 'Developer Tooling Starter Kit',
      href: 'https://dzutech.com/tooling-kit',
      description: 'Opinionated starter configs for linters, CI, and quality gates to spin projects up fast.',
    },
  ],
  posts: [
    {
      title: 'Designing Guardrails for AI-Assisted Coding Teams',
      href: 'https://blog.dzutech.com/ai-guardrails',
      summary: 'A practical framework for weaving human oversight into AI-assisted developer workflows.',
      tags: ['AI', 'Productivity', 'Leadership'],
    },
    {
      title: 'Modern Observability in a Polyglot Stack',
      href: 'https://blog.dzutech.com/observability-polyglot',
      summary: 'Lessons from unifying telemetry across Node.js, Rust, and serverless workloads.',
      tags: ['Observability', 'DevOps'],
    },
    {
      title: 'Scaling Frontend Platforms with Micro-Frontends',
      href: 'https://blog.dzutech.com/micro-frontends-at-scale',
      summary: 'Patterns that helped us grow a design system and shipping velocity without slowing teams down.',
      tags: ['Frontend', 'Architecture'],
    },
  ],
  tutorials: [
    {
      title: 'Getting Started with Event-Driven React Apps',
      href: 'https://learn.dzutech.com/event-driven-react',
      duration: '30 min video',
    },
    {
      title: 'Terraform Modules That Scale with Teams',
      href: 'https://learn.dzutech.com/terraform-modules',
      duration: 'Crash course',
    },
    {
      title: 'Observability 101 for Product Engineers',
      href: 'https://learn.dzutech.com/observability-basics',
      duration: 'Hands-on lab',
    },
  ],
  sections: {
    about: {
      description:
        'I thrive at the intersection of product vision and engineering execution. Over the last decade I have led teams delivering mission-critical platforms for fintech, aerospace, and AI-driven products. I love mentoring builders, crafting ambitious roadmaps, and pairing on architectural deep dives.',
    },
    contact: {
      description:
        'I partner with founders, product leaders, and engineering teams to untangle complex systems, accelerate delivery, and coach developers. Drop a note and let’s explore how we can collaborate.',
    },
  },
}
