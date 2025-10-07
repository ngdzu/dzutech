import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import ExperiencesPage from './pages/ExperiencesPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminBlogsPage } from './pages/AdminBlogsPage'
import { BlogListPage } from './pages/BlogListPage'
import { AdminBlogDetailPage } from './pages/AdminBlogDetailPage'
import { AdminBlogEditorPage } from './pages/AdminBlogEditorPage'
import { AdminBlogsByTagPage } from './pages/AdminBlogsByTagPage'
import { BlogDetailPage } from './pages/BlogDetailPage'
import { BlogTagPage } from './pages/BlogTagPage'
import { LoginPage } from './pages/LoginPage'
import { RequireAuth } from './components/RequireAuth'

function App() {

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/blogs" element={<BlogListPage />} />
      <Route path="/blogs/:postId" element={<BlogDetailPage />} />
      <Route path="/blogs/tags/:tagSlug" element={<BlogTagPage />} />
      <Route path="/experiences" element={<ExperiencesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/blogs"
        element={
          <RequireAuth>
            <AdminBlogsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/blogs/new"
        element={
          <RequireAuth>
            <AdminBlogEditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/blogs/:postId"
        element={
          <RequireAuth>
            <AdminBlogDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/blogs/:postId/edit"
        element={
          <RequireAuth>
            <AdminBlogEditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/blogs/tags/:tagSlug"
        element={
          <RequireAuth>
            <AdminBlogsByTagPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
