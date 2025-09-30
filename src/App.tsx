import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminBlogsPage } from './pages/AdminBlogsPage'
import { AdminBlogEditorPage } from './pages/AdminBlogEditorPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/blogs" element={<AdminBlogsPage />} />
  <Route path="/admin/blogs/new" element={<AdminBlogEditorPage />} />
  <Route path="/admin/blogs/:blogId/edit" element={<AdminBlogEditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
