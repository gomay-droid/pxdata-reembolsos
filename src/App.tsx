import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import AdminPage from "@/pages/AdminPage";
import ExtractLabPage from "@/pages/ExtractLabPage";

function RouterTree() {
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
