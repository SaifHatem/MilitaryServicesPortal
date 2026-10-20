const AuthorityBrand = ({ compact = false }) => {
  return (
    <div
      className={`authority-brand ${compact ? "authority-brand-compact" : ""}`}
    >
      <img
        src="/images/authority-logo.png"
        alt="شعار الهيئة"
        className="authority-logo"
      />

      <div className="authority-brand-text">
        <h1>منظومة الخدمات</h1>
        <p>فرع شئون ضباط الهيئة</p>
      </div>
    </div>
  );
};

export default AuthorityBrand;
