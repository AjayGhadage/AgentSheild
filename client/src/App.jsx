import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import AppLayout  from './components/layout/AppLayout';
import Login      from './pages/Login';
import Home       from './pages/Home';
import SecurityCheck from './pages/SecurityCheck';
import AgentSandbox  from './pages/AgentSandbox';
import AgentActions  from './pages/AgentActions';
import Incidents     from './pages/Incidents';
import History       from './pages/History';
import EvaluationLab from './pages/EvaluationLab';
import Policies      from './pages/Policies';
import Settings      from './pages/Settings';
import Approvals     from './pages/Approvals';
import PaperShowcase from './pages/PaperShowcase';
import DeveloperHub  from './pages/DeveloperHub';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/"            element={<Home />} />
            <Route path="/paper"       element={<PaperShowcase />} />
            <Route path="/integration" element={<DeveloperHub />} />
            <Route path="/sdk"         element={<DeveloperHub />} />
            <Route path="/scan"        element={<SecurityCheck />} />
            <Route path="/sandbox"     element={<AgentSandbox />} />
            <Route path="/actions"     element={<AgentActions />} />
            <Route path="/incidents"   element={<Incidents />} />
            <Route path="/history"     element={<History />} />
            <Route path="/evaluation"  element={<EvaluationLab />} />
            <Route path="/policies"    element={<Policies />} />
            <Route path="/approvals"   element={<Approvals />} />
            <Route path="/settings"    element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
