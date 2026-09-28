import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Applications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/applications/my");

      setApplications(response.data);
    } catch (err) {
      console.error(err);

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
        return status;
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

  const handleDelete = async (application) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الطلب؟\n\nسيتم حذف الطلب وجميع المستندات المرفقة به نهائيًا.",
    );

    if (!confirmed) return;

    try {
      setDeletingId(application._id);
      setError("");

      await api.delete(`/applications/${application._id}`);

      setApplications((previousApplications) =>
        previousApplications.filter((item) => item._id !== application._id),
      );
    } catch (err) {
      console.error("Delete application error:", err);

      setError(err.response?.data?.message || "حدث خطأ أثناء حذف الطلب");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="applications-page">
        <div className="applications-container">
          <div className="applications-loading">جاري تحميل الطلبات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-page">
      <div className="applications-container">
        <div className="applications-header">
          <div>
            <h1>طلباتي</h1>

            <p>يمكنك متابعة جميع الطلبات التي قمت بتقديمها</p>
          </div>

          <button
            className="new-application-button"
            onClick={() => navigate("/services")}
          >
            تقديم طلب جديد
          </button>
        </div>

        {error && <div className="applications-error">{error}</div>}

        {!error && applications.length === 0 && (
          <div className="applications-empty">
            <div className="applications-empty-icon">📄</div>

            <h2>لا توجد طلبات حتى الآن</h2>

            <p>لم تقم بتقديم أي طلبات حتى الآن.</p>

            <button
              onClick={() => navigate("/services")}
              className="empty-services-button"
            >
              استعراض الخدمات
            </button>
          </div>
        )}

        {applications.length > 0 && (
          <div className="applications-list">
            {applications.map((application) => (
              <div className="application-card" key={application._id}>
                <div className="application-card-main">
                  <div className="application-card-icon">📄</div>

                  <div className="application-card-info">
                    <h2>{application.serviceId?.name || "خدمة إلكترونية"}</h2>

                    <div className="application-meta">
                      <span>
                        رقم الطلب:
                        <strong>{application._id}</strong>
                      </span>

                      <span>
                        تاريخ التقديم:
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

                <div className="application-card-footer">
                  <button
                    className="view-application-button"
                    onClick={() => navigate(`/applications/${application._id}`)}
                  >
                    عرض تفاصيل الطلب
                  </button>

                  {application.status === "draft" && (
                    <button
                      className="delete-application-button"
                      onClick={() => handleDelete(application)}
                      disabled={deletingId === application._id}
                    >
                      {deletingId === application._id
                        ? "جاري الحذف..."
                        : "حذف الطلب"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Applications;
