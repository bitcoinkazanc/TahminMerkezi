 "use client";

import MatchCard from "./MatchCard";
import AdsGramTask from "./AdsGramTask";

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
      {matches.map((match, index) => (
        <div key={
          match.id ||
          match.external_id ||
          index
        }>
          <MatchCard match={match} />

          {(index + 1) % 3 === 0 ? (
            <AdsGramTask />
          ) : null}
        </div>
      ))}
    </div>
  );
}