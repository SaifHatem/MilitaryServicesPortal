import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthorityBrand from "../components/AuthorityBrand";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(nationalId.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthorityBrand />

        <h2>تسجيل الدخول</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-national-id">الرقم القومي</label>
          <input
            id="login-national-id"
            type="text"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            placeholder="أدخل الرقم القومي"
            autoComplete="username"
            required
          />

          <label htmlFor="login-password">كلمة المرور</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="أدخل كلمة المرور"
            autoComplete="current-password"
            required
          />

          <div style={{ textAlign: "left", margin: "10px 0" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/forgot-password")}
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p>ليس لديك حساب؟</p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/register")}
        >
          إنشاء حساب
        </button>
      </div>
    </div>
  );
};

export default Login;
