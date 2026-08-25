"use client";

export default function LiderlikPage() {
  return (
    <main
      style={{
        width: "100%",
        maxWidth: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "16px",
        paddingBottom: "100px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontSize: "26px" }}>
          🏆
        </span>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            Liderlik
          </h1>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: "12px",
              opacity: 0.65,
            }}
          >
            TahminMerkezi sıralaması
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          marginBottom: "16px",
          padding: "4px",
          borderRadius: "10px",
          background:
            "rgba(128,128,128,0.10)",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          style={{
            flex: 1,
            border: "none",
            borderRadius: "8px",
            padding: "9px 4px",
            background:
              "var(--primary)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "11px",
          }}
        >
          Genel
        </button>

        <button
          type="button"
          style={{
            flex: 1,
            border: "none",
            borderRadius: "8px",
            padding: "9px 4px",
            background: "transparent",
            color: "inherit",
            fontWeight: 700,
            fontSize: "11px",
          }}
        >
          Haftalık
        </button>

        <button
          type="button"
          style={{
            flex: 1,
            border: "none",
            borderRadius: "8px",
            padding: "9px 4px",
            background: "transparent",
            color: "inherit",
            fontWeight: 700,
            fontSize: "11px",
          }}
        >
          Aylık
        </button>
      </div>

      <section
        style={{
          width: "100%",
          borderRadius: "14px",
          padding: "18px",
          boxSizing: "border-box",
          background:
            "rgba(128,128,128,0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "34px",
            marginBottom: "8px",
          }}
        >
          🏆
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 800,
          }}
        >
          Liderlik tablosu hazırlanıyor
        </h2>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: "12px",
            opacity: 0.65,
            lineHeight: 1.5,
          }}
        >
          Puan, başarı oranı ve doğru
          tahminlere göre kullanıcılar
          burada sıralanacak.
        </p>
      </section>
    </main>
  );
}