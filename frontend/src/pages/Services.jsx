import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Services = () => {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await api.get("/services");

        setServices(response.data);
      } catch {
        setError("حدث خطأ أثناء جلب الخدمات");
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  if (loading) {
    return <div className="loading">جاري تحميل الخدمات...</div>;
  }

  return (
    <div className="services-page">
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")}>العودة</button>

        <h1>الخدمات الإلكترونية</h1>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="services-grid">
        {services.map((service) => (
          <div className="service-card" key={service._id}>
            <h2>{service.name}</h2>

            {service.description && <p>{service.description}</p>}

            <button onClick={() => navigate(`/services/${service._id}`)}>
              تقديم طلب
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Services;
