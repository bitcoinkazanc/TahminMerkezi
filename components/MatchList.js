"components/MatchList.js"

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MatchCard from "./MatchCard";
import AdsGramTask from "./AdsGramTask";
import { getMatchStatus } from "../lib/match-utils";

const FILTER_CATEGORIES = [
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

const filterPanelStyle = {
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "10px",
  marginBottom: "12px",
  background: "var(--surface-soft)",
};

const filterRowStyle = {
  display: "flex",
  gap: "6px",
  overflowX: "auto",
  paddingBottom: "8px",
  marginBottom: "9px",
  scrollbarWidth: "thin",
};

const searchInputWrapperStyle = {
  position: "relative",
  flex: 1,
  minWidth: 0,
};

const searchInputStyle = {
  width: "100%",
  minWidth: 0,
  height: "36px",
  boxSizing: "border-box",
  padding: "7px 30px 7px 29px",
  border: "1px solid var(--border)",
  borderRadius: "9px",
  background: "var(--surface)",
  color: "var(--text)",
  outline: "none",
  fontSize: "11px",
  fontWeight: 600,
};

const clearButtonStyle = {
  flexShrink: 0,
  height: "36px",
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: "9px",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "10px",
  fontWeight: 800,
  cursor: "pointer",
};

function FilterPanel({
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  searchLoading,
  searchResultsCount,
  onClear,
}) {
  const hasActiveFilters =
    statusFilter !== "all" ||
    search.trim().length > 0;

  return (
    <div style={filterPanelStyle}>
      <div style={filterRowStyle}>
        {FILTER_CATEGORIES.map(
          (category) => {
            const active =
              statusFilter === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    category.id
                  )
                }
                style={{
                  flexShrink: 0,
                  border: active
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border)",
                  borderRadius: "8px",
                  background: active
                    ? "var(--primary)"
                    : "var(--surface)",
                  color: active
                    ? "#fff"
                    : "var(--text)",
                  padding: "7px 10px",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 2px 7px rgba(0,0,0,0.12)"
                    : "none",
                }}
              >
                {category.label}
              </button>
            );
          }
        )}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <div style={searchInputWrapperStyle}>
          <span
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform:
                "translateY(-50%)",
              fontSize: "12px",
              pointerEvents: "none",
              opacity: 0.7,
            }}
          >
            🔎
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Takım veya lig ara..."
            style={searchInputStyle}
          />

          {searchLoading ? (
            <span
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                fontSize: "10px",
                opacity: 0.65,
              }}
            >
              ⏳
            </span>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            style={clearButtonStyle}
          >
            Temizle
          </button>
        ) : null}
      </div>

      {search.trim() ? (
        <div
          style={{
            marginTop: "8px",
            padding: "7px 8px",
            borderRadius: "8px",
            background: "var(--surface)",
            border:
              "1px solid var(--border)",
            fontSize: "9px",
            color: "var(--muted)",
            fontWeight: 700,
          }}
        >
          {searchLoading
            ? "Bugünkü maçlar aranıyor..."
            : `${searchResultsCount} arama sonucu bulundu.`}
        </div>
      ) : null}
    </div>
  );
}

function EmptyMatches({
  search,
  hasFilters,
  onClear,
}) {
  return (
    <div className="empty-state small">
      <div className="empty-icon">
        {search.trim() ? "🔎" : "⚽"}
      </div>

      <h3>
        Maç bulunamadı
      </h3>

      <p>
        {search.trim()
          ? "Bugünkü maçlar içinde takım veya lig adına uygun maç bulunmuyor."
          : hasFilters
            ? "Seçtiğin filtrelere uygun maç bulunmuyor."
            : "Şu anda gösterilecek bir maç bulunmuyor."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          className="primary-button"
          onClick={onClear}
        >
          Filtreleri Temizle
        </button>
      ) : null}
    </div>
  );
}

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

  useEffect(() => {
    if (!enableFilters) {
      return undefined;
    }

    const searchText =
      search.trim();

    if (!searchText) {
      setSearchResults([]);
      setSearchLoading(false);

      return undefined;
    }

    const controller =
      new AbortController();

    const timer = setTimeout(
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

          if (!response.ok) {
            throw new Error(
              `Arama isteği başarısız oldu (${response.status}).`
            );
          }

          const result =
            await response.json();

          if (!result?.success) {
            throw new Error(
              result?.error ||
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
  }, [search, enableFilters]);

  const normalizedMatches =
    useMemo(
      () =>
        Array.isArray(matches)
          ? matches
          : [],
      [matches]
    );

  const sourceMatches =
    enableFilters &&
    search.trim()
      ? searchResults
      : normalizedMatches;

  const filteredMatches =
    useMemo(() => {
      if (!enableFilters) {
        return normalizedMatches;
      }

      if (statusFilter === "all") {
        return sourceMatches;
      }

      return sourceMatches.filter(
        (match) =>
          getMatchStatus(match) ===
          statusFilter
      );
    }, [
      enableFilters,
      normalizedMatches,
      sourceMatches,
      statusFilter,
    ]);

  const hasActiveFilters =
    enableFilters &&
    (
      statusFilter !== "all" ||
      search.trim().length > 0
    );

  function clearFilters() {
    setStatusFilter("all");
    setSearch("");
    setSearchResults([]);
    setSearchLoading(false);
  }

  if (
    enableFilters &&
    normalizedMatches.length === 0 &&
    !search.trim()
  ) {
    return (
      <>
        <FilterPanel
          statusFilter={statusFilter}
          setStatusFilter={
            setStatusFilter
          }
          search={search}
          setSearch={setSearch}
          searchLoading={
            searchLoading
          }
          searchResultsCount={
            searchResults.length
          }
          onClear={clearFilters}
        />

        <EmptyMatches
          search={search}
          hasFilters={
            hasActiveFilters
          }
          onClear={clearFilters}
        />
      </>
    );
  }

  return (
    <>
      {enableFilters ? (
        <FilterPanel
          statusFilter={statusFilter}
          setStatusFilter={
            setStatusFilter
          }
          search={search}
          setSearch={setSearch}
          searchLoading={
            searchLoading
          }
          searchResultsCount={
            searchResults.length
          }
          onClear={clearFilters}
        />
      ) : null}

      {filteredMatches.length === 0 ? (
        <EmptyMatches
          search={search}
          hasFilters={
            hasActiveFilters
          }
          onClear={clearFilters}
        />
      ) : (
        <div className="match-list">
          {filteredMatches.map(
            (match, index) => {
              const key =
                match?.id ||
                match?.external_id ||
                `match-${index}`;

              return (
                <div key={key}>
                  <MatchCard
                    match={match}
                  />

                  {(index + 1) % 3 ===
                  0 ? (
                    <AdsGramTask />
                  ) : null}
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );
}