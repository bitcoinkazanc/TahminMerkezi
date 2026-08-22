"use client";

import MatchCard from "./MatchCard";

export default function MatchList({
  matches = [],
}) {
  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return (
      <div className="empty-state small">
        <div className="empty-icon">
          ⚽
        </div>

        <h3>Maç bulunamadı</h3>

        <p>
          Şu anda gösterilecek bir maç
          bulunmuyor.
        </p>
      </div>
    );
  }

  return (
    <div className="match-list">
      {matches.map((match) => (
        <MatchCard
          key={
            match.id ||
            match.external_id
          }
          match={match}
        />
      ))}
    </div>
  );
}