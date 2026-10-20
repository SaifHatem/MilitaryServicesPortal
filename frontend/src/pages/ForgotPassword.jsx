import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthorityBrand from "../components/AuthorityBrand";
import api from "../services/api";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [nationalId, setNationalId] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{14}$/.test(nationalId.trim())) {
      setError("الرقم القومي يجب أن يتكون من 14 رقمًا.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password/verify", {
        nationalId: nationalId.trim(),
        recoveryPhrase: recoveryPhrase.trim(),
      });

      setResetToken(response.data.resetToken);
      setMessage(response.data.message || "تم التحقق بنجاح.");
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "تعذر التحقق من البيانات. حاول مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password/reset", {
        resetToken,
        newPassword,
        confirmPassword,
      });

      setMessage(response.data.message || "تم تغيير كلمة المرور بنجاح.");
      setResetToken("");

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "تعذر تغيير كلمة المرور. ابدأ عملية الاستعادة من جديد.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthorityBrand />

        <h2>استعادة كلمة المرور</h2>

        {step === 1 ? (
          <form onSubmit={handleVerify}>
            <p>
              أدخل الرقم القومي والعبارة السرية التي سجلتها عند إنشاء الحساب.
            </p>

            <label htmlFor="recovery-national-id">الرقم القومي</label>
            <input
              id="recovery-national-id"
              type="text"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              placeholder="14 رقمًا"
              inputMode="numeric"
              maxLength={14}
              required
            />

            <label htmlFor="recovery-phrase">العبارة السرية</label>
            <input
              id="recovery-phrase"
              type="text"
              value={recoveryPhrase}
              onChange={(event) => setRecoveryPhrase(event.target.value)}
              placeholder="أدخل العبارة السرية"
              autoComplete="off"
              required
            />

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="success" role="status">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "جارٍ التحقق..." : "التحقق والمتابعة"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <p>
              تم التحقق من العبارة السرية. أدخل كلمة المرور الجديدة. رمز
              الاستعادة صالح لمدة 5 دقائق.
            </p>

            <label htmlFor="new-password">كلمة المرور الجديدة</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="confirm-new-password">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="success" role="status">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading || !resetToken}>
              {loading ? "جارٍ تغيير كلمة المرور..." : "تغيير كلمة المرور"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStep(1);
                setResetToken("");
                setNewPassword("");
                setConfirmPassword("");
                setError("");
                setMessage("");
              }}
            >
              العودة للتحقق
            </button>
          </form>
        )}

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

export default ForgotPassword;
