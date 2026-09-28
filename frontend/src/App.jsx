import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import ApplicationForm from "./pages/ApplicationForm";
import ProtectedRoute from "./components/ProtectedRoute";
import Applications from "./pages/Applications";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <Services />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/:serviceId"
        element={
          <ProtectedRoute>
            <ServiceDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/:serviceId/apply"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;
