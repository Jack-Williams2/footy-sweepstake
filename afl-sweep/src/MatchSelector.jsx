import { useState, useEffect } from "react";

export default function MatchSelector({ onSelect }) {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetch("https://api.squiggle.com.au/?q=matches;year=2025")
      .then(res => res.json())
      .then(data => {
        if (data && data.matches) {
          setMatches(data.matches);
        }
      });
  }, []);

  return (
    <div>
      <h2>Select a Match</h2>
      <select onChange={(e) => {
        const matchId = e.target.value;
        if (!matchId) return;
        const match = matches.find(m => m.id === parseInt(matchId));
        if (match) {
          // Normalize into the shape our app expects
          onSelect({
            id: match.id,
            hteam: match.hteam,
            ateam: match.ateam,
            season: match.year,        // add season
            round: match.round,        // add round
            competition: "AFLM"        // default to AFL Men's
          });
        }
      }}>
        <option value="">-- Select Match --</option>
        {matches.map(m => (
          <option key={m.id} value={m.id}>
            {m.hteam} vs {m.ateam} (Round {m.round}, {m.year})
          </option>
        ))}
      </select>
    </div>
  );
}
