"use client";

import { useMemo, useState } from "react";
import MatchCard from "./MatchCard";
import AdsGramTask from "./AdsGramTask";
import { getMatchStatus } from "../lib/match-utils";

export default function MatchList({
  matches = [],
  enableFilters = false,
}) {
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [leagueFilter, setLeagueFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

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

  const leagues = useMemo(() => {
    const uniqueLeagues = [
      ...new Set(
        matches
          .map((match) =>
            String(
              match?.league || ""
            ).trim()
          )
          .filter(Boolean)
      ),
    ];

    return uniqueLeagues.sort(
      (a, b) =>
        a.localeCompare(
          b,
          "tr"
        )
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (!enableFilters) {
      return matches;
    }

    const searchText =
      search
        .toLowerCase()
        .trim();

    return matches.filter(
      (match) => {
        const status =
          getMatchStatus(match);

        if (
          statusFilter !== "all" &&
          status !== statusFilter
        ) {
          return false;
        }

        if (
          leagueFilter !== "all" &&
          String(
            match?.league || ""
          ).trim() !==
            leagueFilter
        ) {
          return false;
        }

        if (searchText) {
          const homeTeam =
            String(
              match?.home_team || ""
            ).toLowerCase();

          const awayTeam =
            String(
              match?.away_team || ""
            ).toLowerCase();

          const league =
            String(
              match?.league || ""
            ).toLowerCase();

          if (
            !homeTeam.includes(
              searchText
            ) &&
            !awayTeam.includes(
              searchText
            ) &&
            !league.includes(
              searchText
            )
          ) {
            return false;
          }
        }

        return true;
      }
    );
  }, [
    matches,
    enableFilters,
    statusFilter,
    leagueFilter,
    search,
  ]);

  function clearFilters() {
    setStatusFilter("all");
    setLeagueFilter("all");
    setSearch("");
  }

  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return (
      <div className="empty-state small">
        <div className="empty-icon">
          ⚽
        </div>

        <h3>
          Maç bulunamadı
        </h3>

        <p>
          Şu anda gösterilecek bir maç
          bulunmuyor.
        </p>
      </div>
    );
  }

  return (
    <>
      {enableFilters ? (
        <div
          style={{
            border:
              "1px solid var(--border)",
            borderRadius: "9px",
            padding: "8px",
            marginBottom: "12px",
            background:
              "var(--surface-soft)",
          }}
        >
          {/* DURUM FİLTRELERİ */}

          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "7px",
              marginBottom: "8px",
              scrollbarWidth: "thin",
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
                      flexShrink: 0,
                      border:
                        active
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                      borderRadius:
                        "7px",
                      background:
                        active
                          ? "var(--primary)"
                          : "var(--surface)",
                      color:
                        active
                          ? "#fff"
                          : "var(--text)",
                      padding:
                        "6px 9px",
                      fontSize:
                        "10px",
                      fontWeight:
                        800,
                      cursor:
                        "pointer",
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

          {/* LİG FİLTRELERİ */}

          {leagues.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "7px",
                marginBottom: "8px",
                scrollbarWidth: "thin",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setLeagueFilter(
                    "all"
                  )
                }
                style={{
                  flexShrink: 0,
                  border:
                    leagueFilter ===
                    "all"
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  borderRadius:
                    "7px",
                  background:
                    leagueFilter ===
                    "all"
                      ? "var(--primary)"
                      : "var(--surface)",
                  color:
                    leagueFilter ===
                    "all"
                      ? "#fff"
                      : "var(--text)",
                  padding:
                    "6px 9px",
                  fontSize:
                    "10px",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                🏆 Tüm Ligler
              </button>

              {leagues.map(
                (league) => {
                  const active =
                    leagueFilter ===
                    league;

                  return (
                    <button
                      key={
                        league
                      }
                      type="button"
                      onClick={() =>
                        setLeagueFilter(
                          league
                        )
                      }
                      style={{
                        flexShrink: 0,
                        border:
                          active
                            ? "1px solid var(--primary)"
                            : "1px solid var(--border)",
                        borderRadius:
                          "7px",
                        background:
                          active
                            ? "var(--primary)"
                            : "var(--surface)",
                        color:
                          active
                            ? "#fff"
                            : "var(--text)",
                        padding:
                          "6px 9px",
                        fontSize:
                          "10px",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                        maxWidth:
                          "180px",
                        whiteSpace:
                          "nowrap",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {league}
                    </button>
                  );
                }
              )}
            </div>
          ) : null}

          {/* ARAMA */}

          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "6px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="🔎 Takım veya lig ara..."
              style={{
                flex: 1,
                minWidth: 0,
                height: "32px",
                boxSizing:
                  "border-box",
                padding:
                  "6px 9px",
                border:
                  "1px solid var(--border)",
                borderRadius:
                  "7px",
                background:
                  "var(--surface)",
                color:
                  "var(--text)",
                outline: "none",
                fontSize:
                  "10px",
                fontWeight:
                  600,
              }}
            />

            {(statusFilter !==
              "all" ||
              leagueFilter !==
                "all" ||
              search) ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  flexShrink: 0,
                  height: "32px",
                  padding:
                    "0 9px",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "7px",
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

          {/* SONUÇ SAYISI */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginTop: "8px",
              padding:
                "0 2px",
              fontSize: "9px",
              color:
                "var(--muted)",
              fontWeight: 700,
            }}
          >
            <span>
              Maçlar
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
            Seçtiğin filtrelere
            uygun maç bulunmuyor.
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
                  match={match}
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