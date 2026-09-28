import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(nationalId, password);

      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>بوابة الخدمات الإلكترونية</h1>

        <h2>تسجيل الدخول</h2>

        <form onSubmit={handleSubmit}>
          <label>الرقم القومي</label>

          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="أدخل الرقم القومي"
          />

          <label>كلمة المرور</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="أدخل كلمة المرور"
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p>ليس لديك حساب؟</p>

        <button
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
