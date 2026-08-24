<button
  type="button"
  className="refresh-button"
  onClick={loadMatches}
  disabled={loading}
  aria-label="Maçları yenile"
  style={{
    position: "absolute",
    top: "8px",
    right: "8px",
    transform: "scale(0.75)",
    transformOrigin: "top right",
    zIndex: 10,
  }}
>
  ↻
</button>