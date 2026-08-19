export default function Loading({ text = "Yükleniyor..." }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />

      <p className="loading-text">
        {text}
      </p>
    </div>
  );
}