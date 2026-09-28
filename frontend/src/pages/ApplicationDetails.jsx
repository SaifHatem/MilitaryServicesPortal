import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const statusLabels = {
  draft: "مسودة",
  submitted: "تم التقديم",
  under_review: "قيد المراجعة",
  approved: "تم قبول الطلب",
  rejected: "تم رفض الطلب",
  needs_correction: "يحتاج إلى تصحيح",
};

function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState(null);
  const [files, setFiles] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [addingCorrection, setAddingCorrection] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState("");

  // User
  const [editingCorrections, setEditingCorrections] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingRequirement, setUploadingRequirement] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError("");

      const applicationResponse = await api.get(`/applications/${id}`);

      const applicationData = applicationResponse.data;

      setApplication(applicationData);

      if (applicationData?.serviceId?._id) {
        const requirementsResponse = await api.get(
          `/requirements/${applicationData.serviceId._id}`,
        );

        const requirementsData = requirementsResponse.data;

        setRequirements(
          Array.isArray(requirementsData)
            ? requirementsData
            : requirementsData.requirements || [],
        );
      }

      const filesResponse = await api.get(`/uploads/application/${id}`);

      setFiles(
        Array.isArray(filesResponse.data)
          ? filesResponse.data
          : filesResponse.data.files || [],
      );
    } catch (err) {
      console.error("Application details error:", err);

      setError(
        err.response?.data?.message || "حدث خطأ أثناء تحميل تفاصيل الطلب",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRequirementName = (requirementId) => {
    if (!requirementId) {
      return "مستند";
    }

    const requirementObject =
      typeof requirementId === "object" ? requirementId : null;

    const requirementIdValue = requirementObject?._id || requirementId;

    const requirement = requirements.find(
      (item) => item._id === requirementIdValue,
    );

    return requirement?.name || requirementObject?.name || "مستند";
  };

  /*
   * ==========================================
   * ADMIN ACTIONS
   * ==========================================
   */

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(newStatus);

      await api.patch(`/applications/${id}/status`, {
        status: newStatus,
      });

      await fetchApplication();
    } catch (err) {
      console.error("Status update error:", err);

      alert(err.response?.data?.message || "حدث خطأ أثناء تحديث حالة الطلب");
    } finally {
      setStatusUpdating("");
    }
  };

  const handleAddCorrection = async () => {
    if (!selectedRequirement) {
      alert("برجاء اختيار المستند المطلوب تعديله");
      return;
    }

    if (!correctionMessage.trim()) {
      alert("برجاء كتابة سبب طلب التعديل");
      return;
    }

    try {
      setAddingCorrection(true);

      await api.post(`/applications/${id}/corrections`, {
        requirementId: selectedRequirement,
        message: correctionMessage.trim(),
      });

      setSelectedRequirement("");
      setCorrectionMessage("");

      await fetchApplication();

      alert("تم إرسال طلب التعديل بنجاح");
    } catch (err) {
      console.error("Add correction error:", err);

      alert(err.response?.data?.message || "حدث خطأ أثناء إرسال طلب التعديل");
    } finally {
      setAddingCorrection(false);
    }
  };

  /*
   * ==========================================
   * ADMIN FILE VIEW
   * ==========================================
   */

  const handleViewFile = async (file) => {
    try {
      const response = await api.get(`/uploads/file/${file._id}`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(response.data);

      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (err) {
      console.error("View file error:", err);

      alert(err.response?.data?.message || "تعذر فتح المستند");
    }
  };

  /*
   * ==========================================
   * ADMIN FILE DOWNLOAD
   * ==========================================
   */

  const handleDownloadFile = async (file) => {
    try {
      const response = await api.get(`/uploads/file/${file._id}`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(response.data);

      const link = document.createElement("a");

      link.href = blobUrl;

      link.download = file.originalName || file.filename || "document";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download file error:", err);

      alert(err.response?.data?.message || "تعذر تحميل المستند");
    }
  };

  /*
   * ==========================================
   * USER CORRECTION ACTIONS
   * ==========================================
   */

  const pendingCorrections =
    application?.corrections?.filter(
      (correction) => correction.status === "pending",
    ) || [];

  const handleStartEditing = () => {
    setEditingCorrections(true);
  };

  const handleFileSelection = (requirementId, event) => {
    const selected = Array.from(event.target.files || []);

    setSelectedFiles((previous) => ({
      ...previous,
      [requirementId]: selected,
    }));
  };

  const handleCorrectionUpload = async (requirementId) => {
    const selected = selectedFiles[requirementId] || [];

    if (selected.length === 0) {
      alert("برجاء اختيار المستند أولاً");
      return;
    }

    try {
      setUploadingRequirement(requirementId);

      const formData = new FormData();

      selected.forEach((file) => {
        formData.append("files", file);
      });

      await api.post(`/uploads/${id}/${requirementId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFiles((previous) => ({
        ...previous,
        [requirementId]: [],
      }));

      await fetchApplication();

      alert("تم رفع المستند الجديد بنجاح");
    } catch (err) {
      console.error("Correction upload error:", err);

      alert(err.response?.data?.message || "حدث خطأ أثناء رفع المستند");
    } finally {
      setUploadingRequirement("");
    }
  };

  const handleResubmit = async () => {
    if (pendingCorrections.length > 0) {
      alert("برجاء تعديل جميع المستندات المطلوبة أولاً");
      return;
    }

    try {
      setResubmitting(true);

      await api.post(`/applications/${id}/submit`);

      await fetchApplication();

      alert("تم إعادة تقديم الطلب بنجاح");
    } catch (err) {
      console.error("Resubmit error:", err);

      alert(err.response?.data?.message || "حدث خطأ أثناء إعادة تقديم الطلب");
    } finally {
      setResubmitting(false);
    }
  };

  /*
   * ==========================================
   * LOADING / ERROR
   * ==========================================
   */

  if (loading) {
    return (
      <div className="application-page">
        <div className="application-loading">جاري تحميل تفاصيل الطلب...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="application-page">
        <div className="application-error">{error}</div>

        <button
          className="application-back-button"
          onClick={() => navigate(-1)}
        >
          العودة
        </button>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <div className="application-page">
      <div className="application-wrapper">
        {/* =====================================
            HEADER
        ====================================== */}

        <div className="application-header">
          <div>
            <div className="application-header-label">الخدمة الإلكترونية</div>

            <h1>{application.serviceId?.name || "تفاصيل الطلب"}</h1>

            <p>تفاصيل ومتابعة الطلب</p>
          </div>

          <button
            className="application-back-button"
            onClick={() => navigate(-1)}
          >
            العودة
          </button>
        </div>

        {/* =====================================
            SUMMARY
        ====================================== */}

        <div className="application-summary">
          <div className="summary-box">
            <span>رقم الطلب</span>

            <strong>{application._id}</strong>
          </div>

          <div className="summary-box">
            <span>تاريخ الطلب</span>

            <strong>
              {application.createdAt
                ? new Date(application.createdAt).toLocaleDateString("ar-EG")
                : "-"}
            </strong>
          </div>

          <div className="summary-box">
            <span>حالة الطلب</span>

            <strong
              className={`application-status status-${application.status}`}
            >
              {statusLabels[application.status] || application.status}
            </strong>
          </div>
        </div>

        {/* =====================================
            USER CORRECTION
            THIS SECTION ONLY EXISTS FOR USER
        ====================================== */}

        {!isAdmin && application.status === "needs_correction" && (
          <div className="user-correction-card">
            <div className="user-correction-title">
              <div className="warning-icon">!</div>

              <div>
                <h2>الطلب يحتاج إلى تعديل</h2>

                <p>يرجى تعديل المستندات المطلوبة ثم إعادة تقديم الطلب.</p>
              </div>
            </div>

            <div className="corrections-container">
              {pendingCorrections.length === 0 ? (
                <div className="no-corrections">
                  لا توجد مستندات تحتاج إلى تعديل.
                </div>
              ) : (
                pendingCorrections.map((correction) => {
                  const requirementId =
                    correction.requirementId?._id || correction.requirementId;

                  const selected = selectedFiles[requirementId] || [];

                  const isUploading = uploadingRequirement === requirementId;

                  return (
                    <div className="user-correction-item" key={correction._id}>
                      <div className="correction-document-name">
                        <span>المستند المطلوب تعديله</span>

                        <strong>
                          {getRequirementName(correction.requirementId)}
                        </strong>
                      </div>

                      <div className="correction-message-box">
                        <span>سبب التعديل</span>

                        <p>{correction.message}</p>
                      </div>

                      {editingCorrections && (
                        <div className="user-upload-area">
                          <label className="upload-select-box">
                            <input
                              type="file"
                              multiple
                              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                              onChange={(event) =>
                                handleFileSelection(requirementId, event)
                              }
                            />

                            <span className="upload-icon">+</span>

                            <strong>اختيار المستند الجديد</strong>

                            <small>JPG, PNG, PDF, DOC, DOCX</small>
                          </label>

                          {selected.length > 0 && (
                            <div className="selected-files-list">
                              {selected.map((file, index) => (
                                <div key={`${file.name}-${index}`}>
                                  <span>📄</span>

                                  <span>{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            className="upload-correction-button"
                            onClick={() =>
                              handleCorrectionUpload(requirementId)
                            }
                            disabled={isUploading}
                          >
                            {isUploading
                              ? "جاري الرفع..."
                              : "رفع المستند الجديد"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!editingCorrections && (
              <button
                className="start-edit-button"
                onClick={handleStartEditing}
              >
                تعديل الطلب
              </button>
            )}

            {editingCorrections && (
              <div className="resubmit-container">
                <button
                  className="resubmit-button"
                  onClick={handleResubmit}
                  disabled={resubmitting || pendingCorrections.length > 0}
                >
                  {resubmitting ? "جاري إعادة التقديم..." : "إعادة تقديم الطلب"}
                </button>

                {pendingCorrections.length > 0 && (
                  <p>يجب رفع جميع المستندات المطلوبة أولاً.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================
            APPLICANT DATA
        ====================================== */}

        <div className="application-card">
          <div className="card-title">
            <h2>بيانات مقدم الطلب</h2>
          </div>

          <div className="applicant-grid">
            <div className="applicant-field">
              <span>الاسم</span>

              <strong>{application.applicantName || "-"}</strong>
            </div>

            <div className="applicant-field">
              <span>الرقم القومي</span>

              <strong>{application.nationalId || "-"}</strong>
            </div>

            <div className="applicant-field">
              <span>رقم الهاتف</span>

              <strong>{application.phoneNumber || "-"}</strong>
            </div>
          </div>
        </div>

        {/* =====================================
            DOCUMENTS
        ====================================== */}

        <div className="application-card">
          <div className="card-title">
            <div>
              <h2>المستندات المرفوعة</h2>

              <p>جميع المستندات الخاصة بالطلب</p>
            </div>

            <span className="files-count">{files.length} مستند</span>
          </div>

          {files.length === 0 ? (
            <div className="empty-documents">لا توجد مستندات مرفوعة.</div>
          ) : (
            <div className="documents-container">
              {files.map((file) => (
                <div className="document-card" key={file._id}>
                  <div className="document-main">
                    <div className="document-icon">📄</div>

                    <div className="document-text">
                      <strong>{getRequirementName(file.requirementId)}</strong>

                      <span>
                        {file.originalName || file.filename || "مستند"}
                      </span>
                    </div>
                  </div>

                  {/* ADMIN ONLY */}
                  {isAdmin && (
                    <div className="admin-file-actions">
                      <button
                        className="view-file-button"
                        onClick={() => handleViewFile(file)}
                      >
                        👁 عرض
                      </button>

                      <button
                        className="download-file-button"
                        onClick={() => handleDownloadFile(file)}
                      >
                        ↓ تحميل
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =====================================
            ADMIN SECTION
            THIS SECTION DOES NOT EXIST FOR USER
        ====================================== */}

        {isAdmin && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span>لوحة الإدارة</span>

                <h2>مراجعة الطلب</h2>

                <p>يمكنك مراجعة الطلب واتخاذ الإجراء المناسب.</p>
              </div>
            </div>

            {/* STATUS BUTTONS */}

            <div className="admin-status-buttons">
              <button
                className="admin-status review"
                onClick={() => handleStatusChange("under_review")}
                disabled={statusUpdating === "under_review"}
              >
                {statusUpdating === "under_review"
                  ? "جاري التحديث..."
                  : "قيد المراجعة"}
              </button>

              <button
                className="admin-status approve"
                onClick={() => handleStatusChange("approved")}
                disabled={statusUpdating === "approved"}
              >
                {statusUpdating === "approved"
                  ? "جاري التحديث..."
                  : "قبول الطلب"}
              </button>

              <button
                className="admin-status reject"
                onClick={() => handleStatusChange("rejected")}
                disabled={statusUpdating === "rejected"}
              >
                {statusUpdating === "rejected"
                  ? "جاري التحديث..."
                  : "رفض الطلب"}
              </button>
            </div>

            {/* PREVIOUS CORRECTIONS */}

            {application.corrections?.length > 0 && (
              <div className="previous-corrections">
                <h3>طلبات التعديل السابقة</h3>

                <div>
                  {application.corrections.map((correction) => (
                    <div className="previous-correction" key={correction._id}>
                      <div>
                        <strong>
                          {getRequirementName(correction.requirementId)}
                        </strong>

                        <p>{correction.message}</p>
                      </div>

                      <span
                        className={
                          correction.status === "resolved"
                            ? "resolved"
                            : "pending"
                        }
                      >
                        {correction.status === "resolved"
                          ? "تم التعديل"
                          : "في انتظار التعديل"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADD CORRECTION */}

            <div className="admin-correction-section">
              <h3>طلب تعديل مستند</h3>

              <div className="admin-form">
                <div className="admin-field">
                  <label>المستند المطلوب تعديله</label>

                  <select
                    value={selectedRequirement}
                    onChange={(event) =>
                      setSelectedRequirement(event.target.value)
                    }
                  >
                    <option value="">اختر المستند</option>

                    {requirements.map((requirement) => (
                      <option key={requirement._id} value={requirement._id}>
                        {requirement.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-field">
                  <label>سبب طلب التعديل</label>

                  <textarea
                    value={correctionMessage}
                    onChange={(event) =>
                      setCorrectionMessage(event.target.value)
                    }
                    placeholder="اكتب المطلوب تعديله في المستند..."
                    rows="4"
                  />
                </div>

                <button
                  className="send-correction-button"
                  onClick={handleAddCorrection}
                  disabled={addingCorrection}
                >
                  {addingCorrection
                    ? "جاري إرسال الطلب..."
                    : "طلب تعديل المستند"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationDetails;
