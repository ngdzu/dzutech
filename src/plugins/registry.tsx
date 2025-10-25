import React from 'react';
import { BlogListPage } from '../pages/BlogListPage';
import { BlogDetailPage } from '../pages/BlogDetailPage';
import { BlogTagPage } from '../pages/BlogTagPage';
import ExperiencesPage from '../pages/ExperiencesPage';
import { AdminBlogsPage } from '../pages/AdminBlogsPage';
import { AdminBlogEditorPage } from '../pages/AdminBlogEditorPage';
import { AdminBlogDetailPage } from '../pages/AdminBlogDetailPage';
import { AdminBlogsByTagPage } from '../pages/AdminBlogsByTagPage';
import { AdminExperiencesPage } from '../pages/AdminExperiencesPage';

type RouteDef = { path: string; element: React.ReactElement };

export type PluginRoutes = {
  public?: RouteDef[];
  admin?: RouteDef[];
};

// Registry mapping plugin id -> its public/admin route definitions.
// Keep this mapping small and explicit so new plugins only need to be added here.
export const pluginRouteRegistry: Record<string, PluginRoutes> = {
  blogs: {
    public: [
      { path: '/blogs', element: <BlogListPage /> },
      { path: '/blogs/:postId', element: <BlogDetailPage /> },
      { path: '/blogs/tags/:tagSlug', element: <BlogTagPage /> },
    ],
    admin: [
      { path: '/admin/blogs', element: <AdminBlogsPage /> },
      { path: '/admin/blogs/new', element: <AdminBlogEditorPage /> },
      { path: '/admin/blogs/:postId', element: <AdminBlogDetailPage /> },
      { path: '/admin/blogs/:postId/edit', element: <AdminBlogEditorPage /> },
      { path: '/admin/blogs/tags/:tagSlug', element: <AdminBlogsByTagPage /> },
    ],
  },
  experiences: {
    public: [{ path: '/experiences', element: <ExperiencesPage /> }],
    admin: [{ path: '/admin/experiences', element: <AdminExperiencesPage /> }],
  },
};

export default pluginRouteRegistry;
