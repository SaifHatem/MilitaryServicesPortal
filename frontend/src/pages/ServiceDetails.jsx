import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [requirements, setRequirements] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const loadServiceData = async () => {
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
          error.response?.data?.message || "حدث خطأ أثناء تحميل بيانات الخدمة",
        );
      } finally {
        setLoading(false);
      }
    };

    loadServiceData();
  }, [serviceId]);

  if (loading) {
    return <div className="loading">جاري تحميل بيانات الخدمة...</div>;
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
    <div className="service-details-page">
      <div className="service-details-header">
        <button className="back-button" onClick={() => navigate("/services")}>
          ← العودة للخدمات
        </button>

        <div className="service-title-area">
          <span className="service-small-title">الخدمة الإلكترونية</span>

          <h1>{service?.name}</h1>

          {service?.description && <p>{service.description}</p>}
        </div>
      </div>

      <div className="requirements-container">
        <div className="requirements-heading">
          <h2>المتطلبات والمستندات</h2>

          <p>يرجى مراجعة جميع المتطلبات قبل البدء في تقديم الطلب</p>
        </div>

        <div className="requirements-list">
          {requirements.map((requirement, index) => (
            <div className="requirement-card" key={requirement._id}>
              <div className="requirement-number">{index + 1}</div>

              <div className="requirement-content">
                <h3>{requirement.name}</h3>

                {requirement.description && (
                  <p className="requirement-description">
                    {requirement.description}
                  </p>
                )}

                {requirement.type === "info" && (
                  <p className="requirement-note">مطلوب إجراء فقط</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="service-submit-area">
        <button
          className="start-application-button"
          onClick={() => navigate(`/services/${serviceId}/apply`)}
        >
          بدء تقديم الطلب
        </button>
      </div>
    </div>
  );
};

export default ServiceDetails;
