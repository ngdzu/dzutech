import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import App from './App';
import { PluginsContext, type PluginsContextValue } from './context/pluginsContextValue';

// Mock ContentContext to provide deterministic content for pages that read it
vi.mock('./context/ContentContext', () => ({
  useContent: () => ({
    content: {
      site: { title: 'Site' },
      profile: {
        name: 'Your Name',
        title: 'Engineer',
        summary: '',
        email: '',
        social: { github: '', linkedin: '' },
        tagline: '',
        highlightsEnabled: true,
      },
      experiences: [],
      posts: [],
      sections: {
        contact: { description: '' },
      },
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateSite: vi.fn(),
    updateProfile: vi.fn(),
    updatePosts: vi.fn(),
    updateExperiences: vi.fn(),
    updateSections: vi.fn(),
    resetContent: vi.fn(),
  }),
}));

describe('App routes and plugins integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders /experiences when experiences plugin is enabled', async () => {
    const providerValue: PluginsContextValue = {
      plugins: [
        {
          id: 'experiences',
          name: 'Experiences',
          nav: { path: '/experiences', label: 'Experiences' },
          enabled: true,
        },
      ],
      loading: false,
      error: null,
      refresh: async () => {},
    };

    render(
      <MemoryRouter initialEntries={['/experiences']}>
        <PluginsContext.Provider value={providerValue}>
          <App />
          <LocationReporter />
        </PluginsContext.Provider>
      </MemoryRouter>,
    );

    // Confirm the router remained on /experiences (allow multiple reporters)
    const locs = await screen.findAllByTestId('current-location');
    const paths = locs.map((n) => n.textContent);
    expect(paths).toContain('/experiences');
  });

  it('does not render /experiences when experiences plugin is disabled', async () => {
    const providerValue: PluginsContextValue = {
      plugins: [
        {
          id: 'experiences',
          name: 'Experiences',
          nav: { path: '/experiences', label: 'Experiences' },
          enabled: false,
        },
      ],
      loading: false,
      error: null,
      refresh: async () => {},
    };

    render(
      <MemoryRouter initialEntries={['/experiences']}>
        <PluginsContext.Provider value={providerValue}>
          <App />
          <LocationReporter />
        </PluginsContext.Provider>
      </MemoryRouter>,
    );

    // When disabled the router should redirect to landing (/)
    const locs = await screen.findAllByTestId('current-location');
    const paths = locs.map((n) => n.textContent);
    expect(paths).toContain('/');
  });

  it('renders /blogs when blogs plugin is enabled', async () => {
    const providerValue: PluginsContextValue = {
      plugins: [
        {
          id: 'blogs',
          name: 'Blogs',
          nav: { path: '/blogs', label: 'Blogs' },
          enabled: true,
        },
      ],
      loading: false,
      error: null,
      refresh: async () => {},
    };

    render(
      <MemoryRouter initialEntries={['/blogs']}>
        <PluginsContext.Provider value={providerValue}>
          <App />
          <LocationReporter />
        </PluginsContext.Provider>
      </MemoryRouter>,
    );

    // Confirm router remained on /blogs (allow multiple reporters)
    const locs = await screen.findAllByTestId('current-location');
    const paths = locs.map((n) => n.textContent);
    expect(paths).toContain('/blogs');
  });

  it('does not render /blogs when blogs plugin is disabled', async () => {
    const providerValue: PluginsContextValue = {
      plugins: [
        {
          id: 'blogs',
          name: 'Blogs',
          nav: { path: '/blogs', label: 'Blogs' },
          enabled: false,
        },
      ],
      loading: false,
      error: null,
      refresh: async () => {},
    };

    render(
      <MemoryRouter initialEntries={['/blogs']}>
        <PluginsContext.Provider value={providerValue}>
          <App />
          <LocationReporter />
        </PluginsContext.Provider>
      </MemoryRouter>,
    );

    // When disabled the router should redirect to landing (/)
    const locs = await screen.findAllByTestId('current-location');
    const paths = locs.map((n) => n.textContent);
    expect(paths).toContain('/');
  });
});

// Helper component used by tests to observe current location from React Router
function LocationReporter() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}
