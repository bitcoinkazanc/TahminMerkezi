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
          statusFilter !== "all"
        ) {
          if (
            statusFilter === "upcoming" &&
            status !== "scheduled"
          ) {
            return false;
          }

          if (
            statusFilter === "live" &&
            status !== "live"
          ) {
            return false;
          }

          if (
            statusFilter === "finished" &&
            status !== "finished"
          ) {
            return false;
          }
        }

        if (
          leagueFilter !== "all" &&
          String(
            match?.league || ""
          ) !== leagueFilter
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
            marginBottom: "16px",
          }}
        >
          {/* TAKIM ARAMA */}
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
              width: "100%",
              boxSizing: "border-box",
              padding:
                "12px 14px",
              borderRadius:
                "12px",
              border:
                "1px solid rgba(255,255,255,0.12)",
              background:
                "rgba(255,255,255,0.06)",
              color: "inherit",
              outline: "none",
              marginBottom:
                "10px",
            }}
          />

          {/* DURUM FİLTRESİ */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom:
                "8px",
              WebkitOverflowScrolling:
                "touch",
            }}
          >
            {[
              {
                value: "all",
                label: "Tümü",
              },
              {
                value: "live",
                label: "🔴 Canlı",
              },
              {
                value: "upcoming",
                label: "🟢 Yaklaşan",
              },
              {
                value: "finished",
                label: "Biten",
              },
            ].map(
              (filter) => {
                const active =
                  statusFilter ===
                  filter.value;

                return (
                  <button
                    key={
                      filter.value
                    }
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        filter.value
                      )
                    }
                    style={{
                      flexShrink: 0,
                      border: "none",
                      borderRadius:
                        "999px",
                      padding:
                        "8px 14px",
                      background:
                        active
                          ? "var(--primary-color, #f5b400)"
                          : "rgba(255,255,255,0.07)",
                      color:
                        active
                          ? "#111"
                          : "inherit",
                      fontWeight:
                        active
                          ? "700"
                          : "500",
                      cursor:
                        "pointer",
                    }}
                  >
                    {
                      filter.label
                    }
                  </button>
                );
              }
            )}
          </div>

          {/* LİG FİLTRESİ */}
          {leagues.length >
          0 ? (
            <select
              value={
                leagueFilter
              }
              onChange={(
                event
              ) =>
                setLeagueFilter(
                  event.target
                    .value
                )
              }
              style={{
                width: "100%",
                padding:
                  "11px 12px",
                borderRadius:
                  "12px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.06)",
                color:
                  "inherit",
                outline:
                  "none",
                marginTop:
                  "2px",
              }}
            >
              <option
                value="all"
              >
                🏆 Tüm Ligler
              </option>

              {leagues.map(
                (league) => (
                  <option
                    key={
                      league
                    }
                    value={
                      league
                    }
                  >
                    {league}
                  </option>
                )
              )}
            </select>
          ) : null}
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
            onClick={() => {
              setStatusFilter(
                "all"
              );
              setLeagueFilter(
                "all"
              );
              setSearch("");
            }}
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