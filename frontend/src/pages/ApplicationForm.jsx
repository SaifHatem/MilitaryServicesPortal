import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const ApplicationForm = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [requirements, setRequirements] = useState([]);

  const [formData, setFormData] = useState({
    applicantName: "",
    nationalId: "",
    phoneNumber: "",
  });

  // Files for every requirement
  const [files, setFiles] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const servicesResponse = await api.get("/services");

        const foundService = servicesResponse.data.find(
          (item) => item._id === serviceId,
        );

        if (!foundService) {
          setError("الخدمة غير موجودة");
          return;
        }

        setService(foundService);

        const requirementsResponse = await api.get(
          `/requirements/${serviceId}`,
        );

        setRequirements(requirementsResponse.data);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message || "حدث خطأ أثناء تحميل بيانات الطلب",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [serviceId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Add a new file to a requirement
  const handleFileAdd = (requirementId, event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFiles((previousFiles) => {
      const currentFiles = previousFiles[requirementId] || [];

      return {
        ...previousFiles,
        [requirementId]: [...currentFiles, selectedFile],
      };
    });

    // Allow selecting the same file again later
    event.target.value = "";
  };

  // Delete a selected file
  const handleFileRemove = (requirementId, fileIndex) => {
    setFiles((previousFiles) => {
      const currentFiles = previousFiles[requirementId] || [];

      return {
        ...previousFiles,
        [requirementId]: currentFiles.filter((_, index) => index !== fileIndex),
      };
    });
  };

  // Open selected file
  const handleFileView = (file) => {
    const fileUrl = URL.createObjectURL(file);

    window.open(fileUrl, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(fileUrl);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitError("");

    // =========================
    // Validate basic information
    // =========================

    if (!formData.applicantName.trim()) {
      setSubmitError("من فضلك أدخل الاسم بالكامل");
      return;
    }

    if (!formData.nationalId.trim()) {
      setSubmitError("من فضلك أدخل الرقم القومي");
      return;
    }

    if (formData.nationalId.length !== 14) {
      setSubmitError("الرقم القومي يجب أن يتكون من 14 رقمًا");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setSubmitError("من فضلك أدخل رقم الهاتف");
      return;
    }

    // =========================
    // Validate requirements
    // =========================

    const missingRequirements = [];

    requirements.forEach((requirement) => {
      // Info requirements do not need upload
      if (requirement.type === "info" || requirement.requiresUpload === false) {
        return;
      }

      // Text requirements are handled separately
      if (requirement.type === "text") {
        return;
      }

      const requirementFiles = files[requirement._id] || [];

      if (
        requirement.required &&
        requirementFiles.length < requirement.minFiles
      ) {
        missingRequirements.push(requirement.name);
      }
    });

    // =========================
    // Show missing requirements
    // =========================

    if (missingRequirements.length > 0) {
      setSubmitError(
        `يرجى استكمال المتطلبات التالية:\n\n${missingRequirements
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`,
      );

      return;
    }

    // =========================
    // Start submitting
    // =========================

    try {
      setSubmitting(true);

      // =========================
      // Create application
      // =========================

      const applicationResponse = await api.post("/applications", {
        serviceId: serviceId,
        applicantName: formData.applicantName,
        nationalId: formData.nationalId,
        phoneNumber: formData.phoneNumber,
      });

      console.log("Application response:", applicationResponse.data);

      const applicationId =
        applicationResponse.data.application?._id ||
        applicationResponse.data._id;

      if (!applicationId) {
        throw new Error("لم يتم الحصول على رقم الطلب من الخادم");
      }

      console.log("Application ID:", applicationId);

      // =========================
      // Upload files
      // =========================

      for (const requirement of requirements) {
        const requirementFiles = files[requirement._id] || [];

        if (requirementFiles.length === 0) {
          continue;
        }

        const uploadData = new FormData();

        requirementFiles.forEach((file) => {
          uploadData.append("files", file);
        });

        await api.post(
          `/uploads/${applicationId}/${requirement._id}`,
          uploadData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );
      }

      // =========================
      // Submit application
      // =========================

      await api.post(`/applications/${applicationId}/submit`);

      alert("تم تقديم الطلب بنجاح");

      navigate("/dashboard");
    } catch (error) {
      console.error("Submit error:", error);

      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "حدث خطأ أثناء تقديم الطلب، برجاء المحاولة مرة أخرى",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">جاري تحميل نموذج تقديم الطلب...</div>;
  }

  if (error) {
    return (
      <div className="service-details-page">
        <div className="error">{error}</div>

        <button className="back-button" onClick={() => navigate("/services")}>
          العودة للخدمات
        </button>
      </div>
    );
  }

  return (
    <div className="application-page">
      <div className="application-header">
        <button
          className="back-button"
          onClick={() => navigate(`/services/${serviceId}`)}
        >
          ← العودة للمتطلبات
        </button>

        <div className="application-title-area">
          <span className="service-small-title">تقديم الطلب</span>

          <h1>{service?.name}</h1>

          <p>أدخل البيانات المطلوبة وارفع المستندات الخاصة بالطلب</p>
        </div>
      </div>

      <div className="application-container">
        <form className="application-form" onSubmit={handleSubmit}>
          {/* Applicant Information */}

          <div className="form-section">
            <div className="form-section-header">
              <h2>بيانات مقدم الطلب</h2>

              <p>يرجى إدخال البيانات الأساسية الخاصة بمقدم الطلب</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>الاسم بالكامل</label>

                <input
                  type="text"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  placeholder="أدخل الاسم بالكامل"
                  required
                />
              </div>

              <div className="form-group">
                <label>الرقم القومي</label>

                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  placeholder="أدخل الرقم القومي"
                  maxLength="14"
                  required
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف</label>

                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="أدخل رقم الهاتف"
                  required
                />
              </div>
            </div>
          </div>

          {/* Requirements */}

          <div className="form-section">
            <div className="form-section-header">
              <h2>المستندات المطلوبة</h2>

              <p>قم بإرفاق المستندات المطلوبة لكل بند</p>
            </div>

            <div className="upload-list">
              {requirements.map((requirement, index) => {
                const requirementFiles = files[requirement._id] || [];

                return (
                  <div className="upload-item" key={requirement._id}>
                    <div className="upload-item-number">{index + 1}</div>

                    <div className="upload-item-content">
                      <h3>{requirement.name}</h3>

                      {requirement.description && (
                        <p>{requirement.description}</p>
                      )}

                      {/* Information requirement */}

                      {requirement.type === "info" && (
                        <div className="requirement-info">مطلوب إجراء فقط</div>
                      )}

                      {/* Text requirement */}

                      {requirement.type === "text" && (
                        <div className="form-group requirement-text-input">
                          <input
                            type="text"
                            placeholder={`أدخل ${requirement.name}`}
                          />
                        </div>
                      )}

                      {/* File requirement */}

                      {requirement.type !== "info" &&
                        requirement.type !== "text" &&
                        requirement.requiresUpload !== false && (
                          <div className="attachment-area">
                            {/* Existing files */}

                            {requirementFiles.length > 0 && (
                              <div className="attachment-list">
                                {requirementFiles.map((file, fileIndex) => (
                                  <div
                                    className="attachment-item"
                                    key={`${file.name}-${fileIndex}`}
                                  >
                                    <div className="attachment-file-info">
                                      <div className="attachment-file-icon">
                                        📄
                                      </div>

                                      <div className="attachment-file-name">
                                        <span>{file.name}</span>

                                        <small>
                                          {(file.size / 1024 / 1024).toFixed(2)}{" "}
                                          MB
                                        </small>
                                      </div>
                                    </div>

                                    <div className="attachment-actions">
                                      <button
                                        type="button"
                                        className="attachment-view-button"
                                        onClick={() => handleFileView(file)}
                                      >
                                        👁 عرض
                                      </button>

                                      <button
                                        type="button"
                                        className="attachment-delete-button"
                                        onClick={() =>
                                          handleFileRemove(
                                            requirement._id,
                                            fileIndex,
                                          )
                                        }
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add file */}

                            {(requirement.allowMultiple ||
                              requirementFiles.length === 0) && (
                              <label className="add-attachment-button">
                                <span className="add-attachment-icon">+</span>

                                <span>إضافة مرفق</span>

                                <input
                                  type="file"
                                  hidden
                                  onChange={(event) =>
                                    handleFileAdd(requirement._id, event)
                                  }
                                />
                              </label>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}

          <div className="application-submit">
            {submitError && (
              <div className="application-submit-error">
                <div className="application-submit-error-icon">!</div>

                <div>
                  {submitError.split("\n").map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="submit-application-button"
              disabled={submitting}
            >
              {submitting ? "جاري تقديم الطلب..." : "إرسال الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
