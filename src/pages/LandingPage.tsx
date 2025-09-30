import { type ReactNode, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiArrowDownCircle, FiArrowRight, FiGithub, FiLinkedin, FiMail } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const formatSocialDisplay = (url: string) => {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')
    const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
    return normalizedPath ? `${hostname}${normalizedPath}` : hostname
  } catch (error) {
    if (url.startsWith('mailto:')) {
      return url.replace('mailto:', '')
    }

    return url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  }
}

const Section = ({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string
  title: string
  eyebrow?: string
  children: ReactNode
}) => (
  <section id={id} className="scroll-mt-24">
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -120px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="space-y-2">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">
            {eyebrow}
          </span>
        )}
        <h2 className="text-3xl font-semibold text-white md:text-4xl">{title}</h2>
      </div>
      {children}
    </motion.div>
  </section>
)

const ExperienceCard = ({
  role,
  company,
  year,
  description,
  achievements,
  stack,
}: ReturnType<typeof useContent>['content']['experiences'][number]) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '0px 0px -120px' }}
    transition={{ duration: 0.55, ease: 'easeOut' }}
    className="group relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-night-800/60 to-slate-900/40 p-8 shadow-lg shadow-slate-950/40"
  >
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{year}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">
          {role} · <span className="text-accent-400">{company}</span>
        </h3>
      </div>
      <ul className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
        {stack.map((item) => (
          <li key={item}>
            <button
              type="button"
              className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-slate-300 transition hover:border-accent-400/70 hover:text-accent-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
              aria-label={`Skill: ${item}`}
              onClick={() => {
                /* Reserved for future interactions */
              }}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
    <p className="mt-4 text-base text-slate-300/95">{description}</p>
    <ul className="mt-6 space-y-3 text-sm text-slate-300/90">
      {achievements.map((achievement) => (
        <li key={achievement} className="flex gap-3">
          <span
            className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-500"
            aria-hidden
          />
          <span>{achievement}</span>
        </li>
      ))}
    </ul>
    <div className="pointer-events-none absolute -right-16 top-24 h-40 w-40 rounded-full bg-accent-500/10 blur-3xl transition-transform duration-500 group-hover:-translate-y-6" />
  </motion.article>
)

const PostCard = ({
  post,
  index,
}: {
  post: ReturnType<typeof useContent>['content']['posts'][number]
  index: number
}) => {
  const trimmedContent = (post.content ?? '').trim()
  const previewText = trimmedContent.length > 220 ? `${trimmedContent.slice(0, 220)}…` : trimmedContent

  return (
    <motion.article
      className="group rounded-3xl border border-slate-800/60 bg-slate-900/40 transition hover:border-accent-500/40 hover:bg-night-800/80"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <Link
        to={`/blogs/${index}`}
        className="flex h-full flex-col gap-4 rounded-3xl px-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        <h3 className="text-xl font-semibold text-white transition-colors group-hover:text-accent-200">
          {post.title}
        </h3>
        <p className="text-sm text-slate-300/80 whitespace-pre-line">
          {previewText || 'Content coming soon.'}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 text-xs text-slate-300/80">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-800/60 bg-slate-900/70 px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </motion.article>
  )
}

const TutorialChip = ({
  title,
  href,
  duration,
}: ReturnType<typeof useContent>['content']['tutorials'][number]) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 transition hover:border-accent-400/60 hover:bg-night-800/80"
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '0px 0px -80px' }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
  >
    <div>
      <p className="text-sm font-medium text-white">{title}</p>
      <span className="text-xs text-slate-400">{duration}</span>
    </div>
    <FiArrowDownCircle className="text-accent-400" />
  </motion.a>
)

const navItems = [
  { href: '#experience', label: 'Experience' },
  { href: '#blogs', label: 'Blogs' },
  { href: '#contact', label: 'Contact' },
]

export const LandingPage = () => {
  const location = useLocation()
  const { content } = useContent()
  const { site, profile, experiences, posts, tutorials, sections } = content
  const firstName = profile.name.split(' ')[0] || profile.name
  const siteTitle = site.title.trim()
  const brandLabel = siteTitle ? siteTitle.toLowerCase() : firstName ? firstName.toLowerCase() : 'home'
  const homeLinkLabel = siteTitle || profile.name || 'Home'
  const homeUsesLogo = site.homeButtonMode === 'logo' && Boolean(site.logo?.data)
  const homeLogoAlt = site.logo?.alt?.trim() || homeLinkLabel
  const homeLinkClasses = homeUsesLogo
    ? 'inline-flex items-center gap-3 rounded-xl font-semibold text-white transition hover:text-accent-200'
    : 'inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white transition hover:text-accent-200'
  const contactVisibility = profile.contactVisibility ?? { email: true, linkedin: true, github: true }
  const emailAddress = profile.email.trim()
  const linkedinUrl = profile.social.linkedin.trim()
  const githubUrl = profile.social.github.trim()
  const showEmailContact = Boolean(contactVisibility.email && emailAddress)
  const showLinkedinContact = Boolean(contactVisibility.linkedin && linkedinUrl)
  const showGithubContact = Boolean(contactVisibility.github && githubUrl)
  const highlightsEnabled = profile.highlightsEnabled !== false
  const locationText = profile.location?.trim() ?? ''
  const availabilityText = profile.availability?.value?.trim() ?? ''
  const showAvailability = Boolean(highlightsEnabled && profile.availability?.enabled && availabilityText)
  const focusAreasText = profile.focusAreas?.value?.trim() ?? ''
  const showFocusAreas = Boolean(highlightsEnabled && profile.focusAreas?.enabled && focusAreasText)
  const showLocation = Boolean(highlightsEnabled && locationText)
  const showHighlights = showLocation || showAvailability || showFocusAreas
  const heroGridClasses = showHighlights
    ? 'relative z-10 grid gap-10 md:grid-cols-[2fr,1fr] md:items-center'
    : 'relative z-10 grid gap-10'

  const parseTimestamp = (value: string | undefined): number | null => {
    if (typeof value !== 'string') return null
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  const postsWithIndex = posts
    .map((post, index) => {
      const datedPost = post as typeof post & { updatedAt?: string; createdAt?: string }
      const updatedAt = parseTimestamp(datedPost.updatedAt)
      const createdAt = parseTimestamp(datedPost.createdAt)
      const timestamp = updatedAt ?? createdAt ?? null
      return { post, index, timestamp }
    })
    .sort((a, b) => {
      if (a.timestamp == null && b.timestamp == null) {
        return a.index - b.index
      }
      if (a.timestamp == null) return 1
      if (b.timestamp == null) return -1
      return b.timestamp - a.timestamp
    })

  const recentPosts = postsWithIndex.slice(0, 3)
  const hasMorePosts = posts.length > recentPosts.length

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!location.hash) return

    const targetId = location.hash.replace('#', '')
    if (!targetId) return

    const targetElement = document.getElementById(targetId)
    if (!targetElement) return

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <div className="relative min-h-screen bg-night-900 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-radial opacity-60" aria-hidden />
      <header className="sticky top-0 z-50 border-b border-white/5 bg-night-900/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="#hero"
            className={homeLinkClasses}
            aria-label={homeUsesLogo ? homeLogoAlt : undefined}
          >
            {homeUsesLogo && site.logo?.data ? (
              <img
                src={site.logo.data}
                alt={homeLogoAlt}
                className="h-10 w-auto max-h-10 object-contain"
              />
            ) : (
              <>
                {brandLabel}
                <span className="text-accent-400">.</span>
              </>
            )}
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          {showEmailContact && (
            <a
              href={`mailto:${emailAddress}`}
              className="hidden items-center gap-2 rounded-full border border-accent-500/50 bg-accent-500/10 px-4 py-2 text-sm font-semibold text-accent-200 transition hover:border-accent-500 hover:bg-accent-500/20 md:inline-flex"
            >
              <FiMail />
              Say hello
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-32 px-6 pb-24 pt-20 md:pt-28">
        <section
          id="hero"
          className="relative isolate overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 via-night-800/40 to-slate-900/20 p-10 md:p-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={heroGridClasses}
          >
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-accent-300/80">
                {profile.title}
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
                {profile.name}
              </h1>
              <p className="text-lg text-slate-300/90 md:text-xl">{profile.tagline}</p>
              <p className="max-w-xl text-base text-slate-300/80">{profile.summary}</p>
              {(showEmailContact || showLinkedinContact || showGithubContact) && (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {showEmailContact && (
                    <a
                      href={`mailto:${emailAddress}`}
                      className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2 font-semibold text-night-900 shadow-glow transition hover:bg-accent-400"
                    >
                      <FiMail />
                      Contact me
                    </a>
                  )}
                  {showLinkedinContact && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-5 py-2 font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                    >
                      <FiLinkedin />
                      LinkedIn
                    </a>
                  )}
                  {showGithubContact && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-5 py-2 font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                    >
                      <FiGithub />
                      GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
            {showHighlights && (
              <div className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-inner shadow-black/40">
                <dl className="space-y-4 text-sm">
                  {showLocation && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-slate-400">Location</dt>
                      <dd className="font-medium text-white">{locationText}</dd>
                    </div>
                  )}
                  {showAvailability && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-slate-400">Availability</dt>
                      <dd className="max-w-[200px] text-right font-medium text-white">{availabilityText}</dd>
                    </div>
                  )}
                  {showFocusAreas && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-slate-400">Focus areas</dt>
                      <dd className="max-w-[200px] text-right text-white">{focusAreasText}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </motion.div>
          <motion.div
            className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 6, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </section>
        <Section id="experience" title="Experience" eyebrow="Career timeline">
          <div className="space-y-8">
            {experiences.map((experience) => (
              <ExperienceCard key={`${experience.company}-${experience.role}`} {...experience} />
            ))}
          </div>
        </Section>

        <Section id="blogs" title="Blogs & tutorials" eyebrow="Knowledge sharing">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <div className="space-y-6">
              {recentPosts.length > 0 ? (
                recentPosts.map(({ post, index: postIndex }) => (
                  <PostCard key={`${post.title}-${postIndex}`} post={post} index={postIndex} />
                ))
              ) : (
                <p className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-6 py-8 text-center text-sm text-slate-300/80">
                  Blog posts are on the way. Check back soon.
                </p>
              )}
              {hasMorePosts && (
                <div className="flex justify-end">
                  <Link
                    to="/blogs"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent-200 transition hover:text-accent-100"
                  >
                    View all blogs
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
            <div className="space-y-3 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6">
              <h3 className="text-sm uppercase tracking-[0.35em] text-slate-400">Hands-on tutorials</h3>
              <div className="space-y-3">
                {tutorials.map((tutorial) => (
                  <TutorialChip key={tutorial.href} {...tutorial} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section id="contact" title="Let’s build something" eyebrow="Stay in touch">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-800/70 bg-gradient-to-br from-night-800/80 via-slate-900/40 to-night-900/80 p-8 text-center shadow-glow md:flex-row md:items-center md:justify-between md:text-left">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-white">Ready to craft resilient software?</h3>
              <p className="max-w-2xl text-base text-slate-300/85 whitespace-pre-line">
                {sections.contact.description}
              </p>
            </div>
            {(showEmailContact || showLinkedinContact || showGithubContact) && (
              <div className="flex flex-col gap-3 md:min-w-[220px]">
                {showEmailContact && (
                  <a
                    href={`mailto:${emailAddress}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 font-semibold text-night-900 transition hover:bg-accent-400"
                  >
                    <FiMail />
                    Email {firstName}
                  </a>
                )}
                {showLinkedinContact && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-5 py-3 font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                  >
                    <FiLinkedin />
                    Connect on LinkedIn
                  </a>
                )}
                {showGithubContact && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-5 py-3 font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                  >
                    <FiGithub />
                    Explore GitHub
                  </a>
                )}
              </div>
            )}
          </div>
        </Section>
      </main>

      <footer className="border-t border-white/5 bg-night-900/90 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} {profile.name}. Crafted with React, Tailwind, and curiosity.
          </span>
          {(showLinkedinContact || showGithubContact) && (
            <div className="flex items-center gap-4">
              {showLinkedinContact && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  {formatSocialDisplay(linkedinUrl)}
                </a>
              )}
              {showGithubContact && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  {formatSocialDisplay(githubUrl)}
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}