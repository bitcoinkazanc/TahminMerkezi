"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import MatchCard from "./MatchCard";
import AdsGramTask from "./AdsGramTask";
import { getMatchStatus } from "../lib/match-utils";

export default function MatchList({
  matches = [],
  enableFilters = false,
}) {
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const filterCategories = [
    {
      id: "all",
      label: "🏆 Tümü",
    },
    {
      id: "live",
      label: "🔴 Canlı",
    },
    {
      id: "scheduled",
      label: "🟢 Yaklaşan",
    },
    {
      id: "finished",
      label: "✅ Biten",
    },
  ];

  useEffect(() => {
    if (!enableFilters) {
      return;
    }

    const searchText =
      search.trim();

    if (!searchText) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        async () => {
          try {
            setSearchLoading(true);

            const params =
              new URLSearchParams();

            params.set(
              "search",
              searchText
            );

            const response =
              await fetch(
                `/api/matches?${params.toString()}`,
                {
                  method: "GET",
                  cache: "no-store",
                  signal:
                    controller.signal,
                }
              );

            const result =
              await response.json();

            if (
              !response.ok ||
              !result.success
            ) {
              throw new Error(
                result.error ||
                  "Arama yapılamadı."
              );
            }

            setSearchResults(
              Array.isArray(
                result.matches
              )
                ? result.matches
                : []
            );
          } catch (error) {
            if (
              error?.name !==
              "AbortError"
            ) {
              console.error(
                "Match search error:",
                error
              );

              setSearchResults([]);
            }
          } finally {
            if (
              !controller.signal.aborted
            ) {
              setSearchLoading(false);
            }
          }
        },
        350
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    search,
    enableFilters,
  ]);

  const sourceMatches =
    search.trim()
      ? searchResults
      : Array.isArray(matches)
        ? matches
        : [];

  const filteredMatches =
    useMemo(() => {
      if (!enableFilters) {
        return Array.isArray(matches)
          ? matches
          : [];
      }

      return sourceMatches.filter(
        (match) => {
          const status =
            getMatchStatus(match);

          if (
            statusFilter !==
              "all" &&
            status !==
              statusFilter
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      matches,
      sourceMatches,
      enableFilters,
      statusFilter,
    ]);

  function clearFilters() {
    setStatusFilter("all");
    setSearch("");
    setSearchResults([]);
    setSearchLoading(false);
  }

  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    if (
      enableFilters &&
      search.trim()
    ) {
      // Arama devam eder.
    } else if (
      enableFilters
    ) {
      return (
        <>
          <div
            style={{
              border:
                "1px solid var(--border)",
              borderRadius:
                "12px",
              padding:
                "10px",
              marginBottom:
                "12px",
              background:
                "var(--surface-soft)",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                gap:
                  "6px",
                overflowX:
                  "auto",
                paddingBottom:
                  "8px",
                marginBottom:
                  "9px",
                scrollbarWidth:
                  "thin",
              }}
            >
              {filterCategories.map(
                (category) => {
                  const active =
                    statusFilter ===
                    category.id;

                  return (
                    <button
                      key={
                        category.id
                      }
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          category.id
                        )
                      }
                      style={{
                        flexShrink:
                          0,
                        border:
                          active
                            ? "1px solid var(--primary)"
                            : "1px solid var(--border)",
                        borderRadius:
                          "8px",
                        background:
                          active
                            ? "var(--primary)"
                            : "var(--surface)",
                        color:
                          active
                            ? "#fff"
                            : "var(--text)",
                        padding:
                          "7px 10px",
                        fontSize:
                          "10px",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                        boxShadow:
                          active
                            ? "0 2px 7px rgba(0,0,0,0.12)"
                            : "none",
                      }}
                    >
                      {
                        category.label
                      }
                    </button>
                  );
                }
              )}
            </div>

            <div
              style={{
                position:
                  "relative",
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "6px",
              }}
            >
              <div
                style={{
                  position:
                    "relative",
                  flex:
                    1,
                  minWidth:
                    0,
                }}
              >
                <span
                  style={{
                    position:
                      "absolute",
                    left:
                      "10px",
                    top:
                      "50%",
                    transform:
                      "translateY(-50%)",
                    fontSize:
                      "12px",
                    pointerEvents:
                      "none",
                    opacity:
                      0.7,
                  }}
                >
                  🔎
                </span>

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Takım veya lig ara..."
                  style={{
                    width:
                      "100%",
                    minWidth:
                      0,
                    height:
                      "36px",
                    boxSizing:
                      "border-box",
                    padding:
                      "7px 30px 7px 29px",
                    border:
                      "1px solid var(--border)",
                    borderRadius:
                      "9px",
                    background:
                      "var(--surface)",
                    color:
                      "var(--text)",
                    outline:
                      "none",
                    fontSize:
                      "11px",
                    fontWeight:
                      600,
                  }}
                />

                {searchLoading ? (
                  <span
                    style={{
                      position:
                        "absolute",
                      right:
                        "10px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      fontSize:
                        "10px",
                      opacity:
                        0.65,
                    }}
                  >
                    ⏳
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  flexShrink:
                    0,
                  height:
                    "36px",
                  padding:
                    "0 10px",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "9px",
                  background:
                    "var(--surface)",
                  color:
                    "var(--text)",
                  fontSize:
                    "10px",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                Temizle
              </button>
            </div>
          </div>

          <div className="empty-state small">
            <div className="empty-icon">
              ⚽
            </div>

            <h3>
              Maç bulunamadı
            </h3>

            <p>
              Şu anda gösterilecek
              bir maç bulunmuyor.
            </p>
          </div>
        </>
      );
    }
  }

  return (
    <>
      {enableFilters ? (
        <div
          style={{
            border:
              "1px solid var(--border)",
            borderRadius:
              "12px",
            padding:
              "10px",
            marginBottom:
              "12px",
            background:
              "var(--surface-soft)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              gap:
                "6px",
              overflowX:
                "auto",
              paddingBottom:
                "8px",
              marginBottom:
                "9px",
              scrollbarWidth:
                "thin",
            }}
          >
            {filterCategories.map(
              (category) => {
                const active =
                  statusFilter ===
                  category.id;

                return (
                  <button
                    key={
                      category.id
                    }
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        category.id
                      )
                    }
                    style={{
                      flexShrink:
                        0,
                      border:
                        active
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                      borderRadius:
                        "8px",
                      background:
                        active
                          ? "var(--primary)"
                          : "var(--surface)",
                      color:
                        active
                          ? "#fff"
                          : "var(--text)",
                      padding:
                        "7px 10px",
                      fontSize:
                        "10px",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
                      boxShadow:
                        active
                          ? "0 2px 7px rgba(0,0,0,0.12)"
                          : "none",
                    }}
                  >
                    {
                      category.label
                    }
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              position:
                "relative",
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "6px",
            }}
          >
            <div
              style={{
                position:
                  "relative",
                flex:
                  1,
                minWidth:
                  0,
              }}
            >
              <span
                style={{
                  position:
                    "absolute",
                  left:
                    "10px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  fontSize:
                    "12px",
                  pointerEvents:
                    "none",
                  opacity:
                    0.7,
                }}
              >
                🔎
              </span>

              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Takım veya lig ara..."
                style={{
                  width:
                    "100%",
                  minWidth:
                    0,
                  height:
                    "36px",
                  boxSizing:
                    "border-box",
                  padding:
                    "7px 30px 7px 29px",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "9px",
                  background:
                    "var(--surface)",
                  color:
                    "var(--text)",
                  outline:
                    "none",
                  fontSize:
                    "11px",
                  fontWeight:
                    600,
                }}
              />

              {searchLoading ? (
                <span
                  style={{
                    position:
                      "absolute",
                    right:
                      "10px",
                    top:
                      "50%",
                    transform:
                      "translateY(-50%)",
                    fontSize:
                      "10px",
                    opacity:
                      0.65,
                  }}
                >
                  ⏳
                </span>
              ) : null}
            </div>

            {(
              statusFilter !==
                "all" ||
              search
            ) ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  flexShrink:
                    0,
                  height:
                    "36px",
                  padding:
                    "0 10px",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "9px",
                  background:
                    "var(--surface)",
                  color:
                    "var(--text)",
                  fontSize:
                    "10px",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                Temizle
              </button>
            ) : null}
          </div>

          {search.trim() ? (
            <div
              style={{
                marginTop:
                  "8px",
                padding:
                  "7px 8px",
                borderRadius:
                  "8px",
                background:
                  "var(--surface)",
                border:
                  "1px solid var(--border)",
                fontSize:
                  "9px",
                color:
                  "var(--muted)",
                fontWeight:
                  700,
              }}
            >
              {searchLoading
                ? "Bugünkü maçlar aranıyor..."
                : `${searchResults.length} arama sonucu bulundu.`}
            </div>
          ) : null}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginTop:
                "8px",
              padding:
                "0 2px",
              fontSize:
                "9px",
              color:
                "var(--muted)",
              fontWeight:
                700,
            }}
          >
            <span>
              {search.trim()
                ? "Arama sonuçları"
                : "Maçlar"}
            </span>

            <span>
              {filteredMatches.length} maç
            </span>
          </div>
        </div>
      ) : null}

      {filteredMatches.length ===
      0 ? (
        <div className="empty-state small">
          <div className="empty-icon">
            🔎
          </div>

          <h3>
            Maç bulunamadı
          </h3>

          <p>
            {search.trim()
              ? "Bugünkü maçlar içinde takım veya lig adına uygun maç bulunmuyor."
              : "Seçtiğin filtrelere uygun maç bulunmuyor."}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={
              clearFilters
            }
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="match-list">
          {filteredMatches.map(
            (
              match,
              index
            ) => (
              <div
                key={
                  match.id ||
                  match.external_id ||
                  index
                }
              >
                <MatchCard
                  match={
                    match
                  }
                />

                {(index + 1) %
                  3 ===
                0 ? (
                  <AdsGramTask />
                ) : null}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}