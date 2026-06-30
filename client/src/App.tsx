import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentStore } from "./store/documentStore";
import { AppLayout } from "./components/layout/AppLayout";
import { LandingPage } from "./pages/LandingPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";
import { ExportPage } from "./pages/ExportPage";
import "./index.css";

export default function App() {
  const darkMode = useDocumentStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/review/:documentId" element={<ReviewPage />} />
          <Route path="/queue/:documentId" element={<ReviewQueuePage />} />
          <Route path="/export/:documentId" element={<ExportPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
