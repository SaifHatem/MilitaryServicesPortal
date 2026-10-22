import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthorityBrand from "../components/AuthorityBrand";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="navbar">
        <AuthorityBrand compact />

        <div className="user-area">
          <span>مرحبًا، {user?.name}</span>

          {["admin", "reviewer"].includes(user?.role) && (
            <button onClick={() => navigate("/admin")}>إدارة الطلبات</button>
          )}

          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin/users")}>
              إدارة المستخدمين
            </button>
          )}
          <button onClick={() => navigate("/account-settings")}>
            إعدادات الحساب
          </button>
          <button onClick={handleLogout}>تسجيل الخروج</button>
        </div>
      </header>

      <main className="dashboard-content">
        <h1>الخدمات الإلكترونية</h1>

        <p>اختر الخدمة التي ترغب في تقديم طلب لها</p>

        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => navigate("/services")}>
            <h2>الخدمات</h2>

            <p>عرض جميع الخدمات الإلكترونية</p>

            <button>عرض الخدمات</button>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate("/applications")}
          >
            <h2>طلباتي</h2>

            <p>متابعة الطلبات التي قدمتها</p>

            <button>عرض طلباتي</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
