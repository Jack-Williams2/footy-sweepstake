import React, { useState, useEffect } from "react";

const PlayerList = ({ players, setPlayers }) => {
  const [htmlSnippet, setHtmlSnippet] = useState("");

  useEffect(() => {
    const savedPlayers = JSON.parse(localStorage.getItem("players")) || [];
    setPlayers(savedPlayers);
  }, [setPlayers]);

  const handlePasteHtml = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlSnippet, "text/html");
      const playerNodes = doc.querySelectorAll(
        ".team-lineups__player-entry--home-team .team-lineups__player-entry--name, .team-lineups__player-entry--away-team .team-lineups__player-entry--name"
      );

      const newPlayers = Array.from(playerNodes).map((el) => {
        const first = el.querySelector(".team-lineups__player-entry--name-first")?.textContent || "";
        const last = el.querySelector(".team-lineups__player-entry--name-last")?.textContent || "";
        return `${first} ${last}`;
      });

      setPlayers(newPlayers);
      localStorage.setItem("players", JSON.stringify(newPlayers));
      alert("Players extracted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to parse HTML snippet.");
    }
  };

  return (
    <div>
      <h2>Paste AFL Team Lineup HTML</h2>
      <textarea
        rows={15}
        cols={80}
        value={htmlSnippet}
        onChange={(e) => setHtmlSnippet(e.target.value)}
        placeholder="Paste the HTML snippet here..."
      />
      <br />
      <button onClick={handlePasteHtml}>Extract Players</button>
      <h3>Players ({players.length})</h3>
      <ul>
        {players.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;
