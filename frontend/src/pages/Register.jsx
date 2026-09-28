import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    nationalId: "",
    phoneNumber: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);

      setSuccess("تم إنشاء الحساب بنجاح، يمكنك الآن تسجيل الدخول");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>بوابة الخدمات الإلكترونية</h1>

        <h2>إنشاء حساب</h2>

        <form onSubmit={handleSubmit}>
          <label>الاسم</label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="أدخل الاسم"
          />

          <label>الرقم القومي</label>

          <input
            name="nationalId"
            value={form.nationalId}
            onChange={handleChange}
            placeholder="أدخل الرقم القومي"
          />

          <label>رقم الهاتف</label>

          <input
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="أدخل رقم الهاتف"
          />

          <label>البريد الإلكتروني</label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="البريد الإلكتروني"
          />

          <label>كلمة المرور</label>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="كلمة المرور"
          />

          {error && <div className="error">{error}</div>}

          {success && <div className="success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <button className="secondary-button" onClick={() => navigate("/login")}>
          العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
};

export default Register;
