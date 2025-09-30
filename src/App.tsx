import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminBlogsPage } from './pages/AdminBlogsPage'
import { AdminBlogDetailPage } from './pages/AdminBlogDetailPage'
import { AdminBlogEditorPage } from './pages/AdminBlogEditorPage'
import { AdminBlogsByTagPage } from './pages/AdminBlogsByTagPage'
import { BlogDetailPage } from './pages/BlogDetailPage'
import { BlogTagPage } from './pages/BlogTagPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
  <Route path="/blogs/:blogId" element={<BlogDetailPage />} />
  <Route path="/blogs/tags/:tagSlug" element={<BlogTagPage />} />
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/blogs" element={<AdminBlogsPage />} />
  <Route path="/admin/blogs/new" element={<AdminBlogEditorPage />} />
  <Route path="/admin/blogs/:blogId" element={<AdminBlogDetailPage />} />
  <Route path="/admin/blogs/:blogId/edit" element={<AdminBlogEditorPage />} />
  <Route path="/admin/blogs/tags/:tagSlug" element={<AdminBlogsByTagPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
