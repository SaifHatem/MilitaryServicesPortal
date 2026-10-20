import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AuthorityBrand from "../components/AuthorityBrand";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    nationalId: "",
    phoneNumber: "",
    email: "",
    password: "",
    recoveryPhrase: "",
    confirmRecoveryPhrase: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{14}$/.test(form.nationalId.trim())) {
      setError("الرقم القومي يجب أن يتكون من 14 رقمًا.");
      return;
    }

    if (form.password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
      return;
    }

    if (form.recoveryPhrase.trim().length < 12) {
      setError("العبارة السرية يجب ألا تقل عن 12 حرفًا.");
      return;
    }

    if (
      form.recoveryPhrase.trim().toLowerCase() !==
      form.confirmRecoveryPhrase.trim().toLowerCase()
    ) {
      setError("تأكيد العبارة السرية غير مطابق.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        ...form,
        name: form.name.trim(),
        nationalId: form.nationalId.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        recoveryPhrase: form.recoveryPhrase.trim(),
        confirmRecoveryPhrase: form.confirmRecoveryPhrase.trim(),
      });

      setSuccess("تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.");

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthorityBrand />

        <h2>إنشاء حساب</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">الاسم بالكامل</label>
          <input
            id="register-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="أدخل الاسم بالكامل"
            autoComplete="name"
            required
          />

          <label htmlFor="register-national-id">الرقم القومي</label>
          <input
            id="register-national-id"
            name="nationalId"
            value={form.nationalId}
            onChange={handleChange}
            placeholder="14 رقمًا"
            inputMode="numeric"
            maxLength={14}
            required
          />

          <label htmlFor="register-phone">رقم الهاتف</label>
          <input
            id="register-phone"
            name="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="أدخل رقم الهاتف"
            autoComplete="tel"
            required
          />

          <label htmlFor="register-email">البريد الإلكتروني (اختياري)</label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="البريد الإلكتروني"
            autoComplete="email"
          />

          <label htmlFor="register-password">كلمة المرور</label>
          <input
            id="register-password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="8 أحرف على الأقل"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <hr />

          <h3>عبارة استعادة الحساب</h3>
          <p>
            احفظ العبارة السرية في مكان آمن. ستحتاج إليها إذا نسيت كلمة المرور.
          </p>

          <label htmlFor="recovery-phrase">العبارة السرية</label>
          <input
            id="recovery-phrase"
            type="text"
            name="recoveryPhrase"
            value={form.recoveryPhrase}
            onChange={handleChange}
            placeholder="12 حرفًا على الأقل"
            autoComplete="off"
            minLength={12}
            maxLength={200}
            required
          />

          <label htmlFor="confirm-recovery-phrase">تأكيد العبارة السرية</label>
          <input
            id="confirm-recovery-phrase"
            type="text"
            name="confirmRecoveryPhrase"
            value={form.confirmRecoveryPhrase}
            onChange={handleChange}
            placeholder="أعد كتابة العبارة السرية"
            autoComplete="off"
            minLength={12}
            maxLength={200}
            required
          />

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="success" role="status">
              {success}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/login")}
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
};

export default Register;
