import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/applications/all");

      setApplications(response.data);
    } catch (err) {
      console.error("Admin applications error:", err);

      setError(err.response?.data?.message || "حدث خطأ أثناء تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "draft":
        return "مسودة";

      case "submitted":
        return "تم التقديم";

      case "under_review":
        return "قيد المراجعة";

      case "approved":
        return "تم قبول الطلب";

      case "rejected":
        return "تم رفض الطلب";

      case "needs_correction":
        return "يحتاج إلى تصحيح";

      default:
        return status || "-";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "draft":
        return "status-draft";

      case "submitted":
        return "status-submitted";

      case "under_review":
        return "status-review";

      case "approved":
        return "status-approved";

      case "rejected":
        return "status-rejected";

      case "needs_correction":
        return "status-correction";

      default:
        return "";
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

  const filteredApplications =
    filter === "all"
      ? applications
      : applications.filter((application) => application.status === filter);

  const countStatus = (status) => {
    return applications.filter((application) => application.status === status)
      .length;
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-loading">جاري تحميل لوحة التحكم...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div>
            <span className="admin-small-title">لوحة الإدارة</span>

            <h1>إدارة الطلبات</h1>

            <p>يمكنك متابعة ومراجعة جميع الطلبات المقدمة</p>
          </div>

          <button className="admin-refresh-button" onClick={loadApplications}>
            تحديث الطلبات
          </button>
        </div>
        {error && <div className="admin-error"> {error} </div>} {/* Filter */}{" "}
        <div className="admin-filter-bar">
          {" "}
          <label htmlFor="status-filter"> فلترة الطلبات </label>{" "}
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {" "}
            <option value="all">كل الطلبات</option>{" "}
            <option value="submitted">تم التقديم</option>{" "}
            <option value="under_review">قيد المراجعة</option>{" "}
            <option value="approved">تم قبول الطلب</option>{" "}
            <option value="rejected">تم رفض الطلب</option>{" "}
            <option value="needs_correction"> يحتاج إلى تصحيح </option>{" "}
          </select>{" "}
        </div>{" "}
        {/* Statistics */}
        {/* Statistics */}
        <div className="admin-stats-grid">
          <div
            className={`admin-stat-card ${
              filter === "all" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            <div className="admin-stat-icon">📋</div>

            <div>
              <span>إجمالي الطلبات</span>
              <strong>{applications.length}</strong>
            </div>
          </div>

          <div
            className={`admin-stat-card ${
              filter === "submitted" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("submitted")}
          >
            <div className="admin-stat-icon">📤</div>

            <div>
              <span>تم التقديم</span>
              <strong>{countStatus("submitted")}</strong>
            </div>
          </div>

          <div
            className={`admin-stat-card ${
              filter === "under_review" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("under_review")}
          >
            <div className="admin-stat-icon">🔍</div>

            <div>
              <span>قيد المراجعة</span>
              <strong>{countStatus("under_review")}</strong>
            </div>
          </div>

          <div
            className={`admin-stat-card ${
              filter === "approved" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("approved")}
          >
            <div className="admin-stat-icon">✅</div>

            <div>
              <span>مقبولة</span>
              <strong>{countStatus("approved")}</strong>
            </div>
          </div>

          <div
            className={`admin-stat-card ${
              filter === "rejected" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("rejected")}
          >
            <div className="admin-stat-icon">❌</div>

            <div>
              <span>مرفوضة</span>
              <strong>{countStatus("rejected")}</strong>
            </div>
          </div>

          <div
            className={`admin-stat-card ${
              filter === "needs_correction" ? "admin-stat-card-active" : ""
            }`}
            onClick={() => setFilter("needs_correction")}
          >
            <div className="admin-stat-icon">🔄</div>

            <div>
              <span>تحتاج تصحيح</span>
              <strong>{countStatus("needs_correction")}</strong>
            </div>
          </div>
        </div>
        {/* Applications */}
        <div className="admin-applications-section">
          <div className="admin-section-header">
            <div>
              <h2>
                {filter === "all"
                  ? "جميع الطلبات"
                  : `الطلبات: ${getStatusText(filter)}`}
              </h2>

              <p>
                عدد الطلبات: <strong>{filteredApplications.length}</strong>
              </p>
            </div>

            {filter !== "all" && (
              <button
                className="admin-clear-filter"
                onClick={() => setFilter("all")}
              >
                عرض جميع الطلبات
              </button>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">📭</div>

              <h3>لا توجد طلبات</h3>

              <p>لا توجد طلبات في الحالة المحددة حاليًا.</p>
            </div>
          ) : (
            <div className="admin-applications-list">
              {filteredApplications.map((application) => (
                <div className="admin-application-card" key={application._id}>
                  <div className="admin-application-main">
                    <div className="admin-application-icon">📄</div>

                    <div className="admin-application-info">
                      <h3>{application.serviceId?.name || "خدمة إلكترونية"}</h3>

                      <div className="admin-application-meta">
                        <span>
                          رقم الطلب:
                          <strong>{application._id}</strong>
                        </span>

                        <span>
                          مقدم الطلب:
                          <strong>{application.applicantName || "-"}</strong>
                        </span>

                        <span>
                          الرقم القومي:
                          <strong>{application.nationalId || "-"}</strong>
                        </span>

                        <span>
                          تاريخ الطلب:
                          <strong>{formatDate(application.createdAt)}</strong>
                        </span>
                      </div>
                    </div>

                    <div
                      className={`application-status ${getStatusClass(
                        application.status,
                      )}`}
                    >
                      {getStatusText(application.status)}
                    </div>
                  </div>

                  <div className="admin-application-footer">
                    <button
                      className="admin-view-button"
                      onClick={() =>
                        navigate(`/applications/${application._id}`)
                      }
                    >
                      عرض تفاصيل الطلب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
