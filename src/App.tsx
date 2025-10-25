import { Navigate, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import { PluginsContext } from './context/pluginsContextValue';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUploadsPage } from './pages/AdminUploadsPage';
import AdminPluginsPage from './pages/AdminPluginsPage';
import { LoginPage } from './pages/LoginPage';
import { RequireAuth } from './components/RequireAuth';
import pluginRouteRegistry from './plugins/registry';

function App() {
  const { plugins } = useContext(PluginsContext);

  const enabledPlugins = plugins.filter((p) => p.enabled !== false);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Register public routes for each enabled plugin using the registry */}
      {enabledPlugins.map((plugin) => {
        const def = pluginRouteRegistry[plugin.id];
        if (!def?.public) return null;
        return def.public.map((r) => (
          <Route key={`public-${plugin.id}-${r.path}`} path={r.path} element={r.element} />
        ));
      })}

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />

      {/* Register admin routes from plugin registry */}
      {enabledPlugins.map((plugin) => {
        const def = pluginRouteRegistry[plugin.id];
        if (!def?.admin) return null;
        return def.admin.map((r) => (
          <Route
            key={`admin-${plugin.id}-${r.path}`}
            path={r.path}
            element={<RequireAuth>{r.element}</RequireAuth>}
          />
        ));
      })}

      <Route
        path="/admin/uploads"
        element={
          <RequireAuth>
            <AdminUploadsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/plugins"
        element={
          <RequireAuth>
            <AdminPluginsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
