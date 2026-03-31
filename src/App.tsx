import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginScreen } from "@/components/auth/LoginScreen";
import Index from "@/pages/Index";
import AdminPage from "@/pages/AdminPage";
import ExtractLabPage from "@/pages/ExtractLabPage";
import { productionApiBaseMissingMessage } from "@/lib/apiBase";

function RouterTree() {
  const apiBaseWarn = productionApiBaseMissingMessage();
  if (apiBaseWarn) {
    return <LoginScreen configError={apiBaseWarn} onLoggedIn={() => {}} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin/empresa" element={<AdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/lab/extracao" element={<ExtractLabPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

  if (!clientId) {
    return <RouterTree />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <RouterTree />
    </GoogleOAuthProvider>
  );
}
