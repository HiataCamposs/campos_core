import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Spinner from "./components/Spinner";

// Cada tela vira um arquivo JS separado, baixado só quando é aberta.
// Assim o login e a primeira tela não carregam, por exemplo, a biblioteca
// de gráficos do Gerencial.
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Gelo = lazy(() => import("./pages/Gelo"));
const Revenda = lazy(() => import("./pages/Revenda"));
const Reposicao = lazy(() => import("./pages/Reposicao"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const Agendamentos = lazy(() => import("./pages/Agendamentos"));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner fullScreen />;

  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<Spinner fullScreen />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="gelo" element={<Gelo />} />
        <Route path="revenda" element={<Revenda />} />
        <Route path="reposicao" element={<Reposicao />} />
        <Route path="veiculos" element={<Veiculos />} />
        <Route path="agendamentos" element={<Agendamentos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
