import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const roleLabels = {
  user: "مستخدم",
  reviewer: "مراجع طلبات",
  admin: "مدير النظام",
};

const roleClasses = {
  user: "users-role-user",
  reviewer: "users-role-reviewer",
  admin: "users-role-admin",
};

function EyeIcon({ visible }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.5 4.5 9.5 6.2a1.5 1.5 0 0 1 0 1.6 15 15 0 0 1-3.1 3.5" />
          <path d="M6.2 6.2a16 16 0 0 0-3.7 5 1.5 1.5 0 0 0 0 1.6C3.5 14.5 6.8 19 12 19a10 10 0 0 0 3-.5" />
        </>
      ) : (
        <>
          <path d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function UsersManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    nationalId: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    recoveryPhrase: "",
    confirmRecoveryPhrase: "",
    role: "user",
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users");
      setUsers(response.data.users || []);
    } catch (err) {
      console.error("Load users error:", err);

      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الحسابات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!/^\d{14}$/.test(form.nationalId.trim())) {
      setError("الرقم القومي يجب أن يتكون من 14 رقمًا");
      return;
    }

    if (form.password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    const recoveryPhrase = form.recoveryPhrase.trim().toLowerCase();

    const confirmRecoveryPhrase = form.confirmRecoveryPhrase
      .trim()
      .toLowerCase();

    if (recoveryPhrase.length < 12 || recoveryPhrase.length > 200) {
      setError("العبارة السرية يجب أن تكون بين 12 و200 حرف");
      return;
    }

    if (recoveryPhrase !== confirmRecoveryPhrase) {
      setError("تأكيد العبارة السرية غير مطابق");
      return;
    }

    try {
      setSaving(true);

      // لا نرسل تأكيد كلمة المرور للـ Backend.
      // لكن نرسل تأكيد العبارة السرية لأنه مطلوب للتحقق.
      const { confirmPassword, ...formPayload } = form;

      const payload = {
        ...formPayload,
        name: form.name.trim(),
        nationalId: form.nationalId.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        recoveryPhrase,
        confirmRecoveryPhrase,
      };

      const response = await api.post("/users", payload);

      setUsers((current) => [response.data.user, ...current]);

      setForm({
        name: "",
        nationalId: "",
        phoneNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
        recoveryPhrase: "",
        confirmRecoveryPhrase: "",
        role: "user",
      });

      setShowPassword(false);
      setShowConfirmPassword(false);

      setSuccess(response.data.message || "تم إنشاء الحساب بنجاح");
    } catch (err) {
      console.error("Create user error:", err);

      setError(err.response?.data?.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `تحذير: هل أنت متأكد من حذف حساب "${user.name}" نهائيًا؟\n\nسيتم حذف الحساب وطلباته والمستندات المرتبطة بها، ولا يمكن التراجع عن العملية.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(user._id);

    try {
      const response = await api.delete(`/users/${user._id}`);

      setUsers((current) => current.filter((item) => item._id !== user._id));

      setSuccess(response.data.message || "تم حذف الحساب بنجاح");
    } catch (err) {
      console.error("Delete user error:", err);

      setError(err.response?.data?.message || "حدث خطأ أثناء حذف الحساب");
    } finally {
      setDeletingId("");
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderPasswordToggle = (visible, toggleVisibility) => (
    <button
      type="button"
      className="users-password-toggle"
      onClick={toggleVisibility}
      aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
      title={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
    >
      <EyeIcon visible={visible} />
    </button>
  );

  return (
    <div className="users-management-page">
      <div className="users-management-container">
        <header className="users-management-header">
          <div>
            <span className="users-management-eyebrow">لوحة الإدارة</span>

            <h1>إدارة الحسابات</h1>

            <p>إنشاء الحسابات ومتابعة الأدوار وحالة كل حساب.</p>
          </div>

          <div className="users-management-header-actions">
            <button
              type="button"
              className="users-secondary-button"
              onClick={() => navigate("/admin")}
            >
              العودة للطلبات
            </button>

            <button
              type="button"
              className="users-secondary-button"
              onClick={loadUsers}
              disabled={loading}
            >
              تحديث الحسابات
            </button>
          </div>
        </header>

        {error && (
          <div className="users-alert users-alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="users-alert users-alert-success" role="status">
            {success}
          </div>
        )}

        <section className="users-management-card">
          <div className="users-card-heading">
            <h2>إنشاء حساب جديد</h2>

            <p>
              أدخل العبارة السرية بدقة؛ سيحتاجها المستخدم لاستعادة حسابه إذا نسي
              كلمة المرور.
            </p>
          </div>

          <form className="users-create-form" onSubmit={handleCreateUser}>
            <div className="users-form-field">
              <label htmlFor="user-name">الاسم بالكامل</label>

              <input
                id="user-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="users-form-field">
              <label htmlFor="user-national-id">الرقم القومي</label>

              <input
                id="user-national-id"
                name="nationalId"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{14}"
                maxLength={14}
                value={form.nationalId}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>

            <div className="users-form-field">
              <label htmlFor="user-phone">رقم الهاتف</label>

              <input
                id="user-phone"
                name="phoneNumber"
                type="tel"
                value={form.phoneNumber}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="users-form-field">
              <label htmlFor="user-email">البريد الإلكتروني (اختياري)</label>

              <input
                id="user-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="users-form-field">
              <label htmlFor="user-password">كلمة المرور</label>

              <div className="users-password-wrapper">
                <input
                  id="user-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                {renderPasswordToggle(showPassword, () =>
                  setShowPassword((current) => !current),
                )}
              </div>

              <small>8 أحرف على الأقل</small>
            </div>

            <div className="users-form-field">
              <label htmlFor="user-confirm-password">تأكيد كلمة المرور</label>

              <div className="users-password-wrapper">
                <input
                  id="user-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                {renderPasswordToggle(showConfirmPassword, () =>
                  setShowConfirmPassword((current) => !current),
                )}
              </div>

              {form.confirmPassword &&
                form.password !== form.confirmPassword && (
                  <small className="users-password-error">
                    كلمة المرور وتأكيدها غير متطابقين
                  </small>
                )}
            </div>

            <div className="users-form-field">
              <label htmlFor="user-recovery-phrase">
                العبارة السرية لاستعادة الحساب
              </label>

              <input
                id="user-recovery-phrase"
                name="recoveryPhrase"
                type="text"
                minLength={12}
                maxLength={200}
                value={form.recoveryPhrase}
                onChange={handleChange}
                autoComplete="off"
                required
              />

              <small>من 12 إلى 200 حرف. تُحفظ في قاعدة البيانات كـ Hash.</small>
            </div>

            <div className="users-form-field">
              <label htmlFor="user-confirm-recovery-phrase">
                تأكيد العبارة السرية
              </label>

              <input
                id="user-confirm-recovery-phrase"
                name="confirmRecoveryPhrase"
                type="text"
                minLength={12}
                maxLength={200}
                value={form.confirmRecoveryPhrase}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>

            <div className="users-form-field">
              <label htmlFor="user-role">نوع الحساب</label>

              <select
                id="user-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="user">مستخدم</option>
                <option value="reviewer">مراجع طلبات</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>

            <div className="users-form-actions">
              <button
                type="submit"
                className="users-primary-button"
                disabled={saving}
              >
                {saving ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </div>
          </form>
        </section>

        <section className="users-management-card">
          <div className="users-card-heading users-list-heading">
            <div>
              <h2>الحسابات المسجلة</h2>
              <p>إجمالي الحسابات: {users.length}</p>
            </div>

            <div className="users-count-badge">
              نشط: {users.filter((user) => user.isActive).length}
            </div>
          </div>

          {loading ? (
            <div className="users-empty-state">جاري تحميل الحسابات...</div>
          ) : users.length === 0 ? (
            <div className="users-empty-state">لا توجد حسابات لعرضها.</div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الرقم القومي</th>
                    <th>رقم الهاتف</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td data-label="الاسم">{user.name}</td>

                      <td data-label="الرقم القومي">{user.nationalId}</td>

                      <td data-label="رقم الهاتف">{user.phoneNumber}</td>

                      <td data-label="البريد الإلكتروني">
                        {user.email || "-"}
                      </td>

                      <td data-label="الدور">
                        <span
                          className={`users-role-badge ${
                            roleClasses[user.role] || ""
                          }`}
                        >
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>

                      <td data-label="الحالة">
                        <span
                          className={`users-state-badge ${
                            user.isActive
                              ? "users-state-active"
                              : "users-state-disabled"
                          }`}
                        >
                          {user.isActive ? "نشط" : "معطّل"}
                        </span>
                      </td>

                      <td data-label="تاريخ الإنشاء">
                        {formatDate(user.createdAt)}
                      </td>

                      <td data-label="الإجراء">
                        <button
                          type="button"
                          className="users-disable-button"
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingId === user._id}
                        >
                          {deletingId === user._id
                            ? "جاري الحذف..."
                            : "حذف الحساب"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default UsersManagement;
