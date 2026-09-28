import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const ApplicationForm = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <div className="loading">جاري تحميل بيانات الطلب...</div>;
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
          ← العودة للخدمة
        </button>

        <div className="application-title-area">
          <span className="service-small-title">تقديم الطلب</span>

          <h1>{service?.name}</h1>

          {service?.description && <p>{service.description}</p>}
        </div>
      </div>

      <div className="application-container">
        <div className="application-heading">
          <h2>متطلبات الطلب</h2>

          <p>
            يرجى تجهيز جميع المستندات والبيانات المطلوبة قبل بدء تقديم الطلب
          </p>
        </div>

        <div className="application-requirements">
          {requirements.map((requirement, index) => (
            <div className="application-requirement" key={requirement._id}>
              <div className="application-requirement-number">{index + 1}</div>

              <div className="application-requirement-content">
                <h3>{requirement.name}</h3>

                {requirement.description && <p>{requirement.description}</p>}

                {requirement.type === "info" && (
                  <span className="requirement-info">مطلوب إجراء فقط</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="application-start-section">
          <button
            className="start-application-button"
            onClick={() => alert("سيتم بدء تقديم الطلب في الخطوة التالية")}
          >
            بدء تقديم الطلب
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;
