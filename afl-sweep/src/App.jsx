// src/App.jsx
import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * Robust sweepstake app with correct persistence.
 * Key fix: "hydrated" flag prevents first-render effects from overwriting localStorage.
 * Reserved "slots" (not names) are assigned to users with a cost and filled from each sweep's pool,
 * so both sweeps receive extras independently.
 */

function App() {
  // Core state
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [contribution, setContribution] = useState(10);

  // Reserved slot preview + selections
  // reservedSlotsRemaining: how many leftover slots (count) you can assign before creating sweeps
  // reservedSelections: { [user]: { count: number, total: number } }
  const [reservedSlotsRemaining, setReservedSlotsRemaining] = useState(0);
  const [reservedSelections, setReservedSelections] = useState({});

  // Sweeps object:
  // {
  //   "Norm Smith": {
  //     assignments: { [user]: string[] },
  //     pool: string[],
  //     userContributions: { [user]: number },
  //     potBonus: number,
  //     winner: { player, user } | null
  //   },
  //   "First Goal": { ... }
  // }
  const [sweeps, setSweeps] = useState({});

  // HYDRATION GUARD — prevents "empty initial state" from overwriting saved data.
  const [hydrated, setHydrated] = useState(false);

  // --------------------------
  // Load from localStorage once
  // --------------------------
  useEffect(() => {
    try {
      const lsUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const lsPlayers = JSON.parse(localStorage.getItem("players") || "[]");
      const lsContribution = JSON.parse(localStorage.getItem("contribution") || "10");
      const lsReservedSlotsRemaining = JSON.parse(localStorage.getItem("reservedSlotsRemaining") || "0");
      const lsReservedSelections = JSON.parse(localStorage.getItem("reservedSelections") || "{}");
      const lsSweeps = JSON.parse(localStorage.getItem("sweeps") || "{}");

      if (Array.isArray(lsUsers)) setUsers(lsUsers);
      if (Array.isArray(lsPlayers)) setPlayers(lsPlayers);
      if (typeof lsContribution === "number") setContribution(lsContribution);
      if (typeof lsReservedSlotsRemaining === "number") setReservedSlotsRemaining(lsReservedSlotsRemaining);
      if (lsReservedSelections && typeof lsReservedSelections === "object") setReservedSelections(lsReservedSelections);
      if (lsSweeps && typeof lsSweeps === "object") setSweeps(lsSweeps);
    } catch {
      // If anything is corrupted, fall back to defaults
      setUsers([]);
      setPlayers([]);
      setContribution(10);
      setReservedSlotsRemaining(0);
      setReservedSelections({});
      setSweeps({});
    } finally {
      // Mark as hydrated so save effects can run safely
      setHydrated(true);
    }
  }, []);

  // --------------------------
  // Persist to localStorage (guarded by "hydrated")
  // --------------------------
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("users", JSON.stringify(users));
  }, [users, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("players", JSON.stringify(players));
  }, [players, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("contribution", JSON.stringify(contribution));
  }, [contribution, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("reservedSlotsRemaining", JSON.stringify(reservedSlotsRemaining));
  }, [reservedSlotsRemaining, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("reservedSelections", JSON.stringify(reservedSelections));
  }, [reservedSelections, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("sweeps", JSON.stringify(sweeps));
  }, [sweeps, hydrated]);

  // --------------------------
  // Helpers
  // --------------------------
  const parsePlayersFromHtml = (html) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Anchor with class team-lineups__player-entry is the most consistent selector
      const entryEls = Array.from(doc.querySelectorAll(".team-lineups__player-entry"));
      const names = new Set();
      entryEls.forEach((el) => {
        const title = el.getAttribute("title");
        if (title) {
          names.add(title.split(".")[0].trim());
          return;
        }
        const aria = el.getAttribute("aria-label");
        if (aria) names.add(aria.split(".")[0].trim());
      });
      return Array.from(names);
    } catch {
      return [];
    }
  };

  const handleExtractPlayers = () => {
    const parsed = parsePlayersFromHtml(htmlSnippet);
    if (!parsed.length) {
      alert("No players found in pasted HTML");
      return;
    }
    setPlayers((prev) => Array.from(new Set([...prev, ...parsed])));
    setHtmlSnippet("");
  };

  const addUser = () => {
    const name = newUser.trim();
    if (name && !users.includes(name)) {
      setUsers((prev) => [...prev, name]);
      setNewUser("");
    }
  };

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (name && !players.includes(name)) {
      setPlayers((prev) => [...prev, name]);
      setNewPlayer("");
    }
  };

  const assignPlayersEvenlyWithLeftover = (playerList, userList) => {
    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const assignments = {};
    userList.forEach((u) => (assignments[u] = []));
    const remainder = shuffled.length % userList.length;
    const leftover = remainder > 0 ? shuffled.slice(-remainder) : [];
    const assignable = remainder > 0 ? shuffled.slice(0, shuffled.length - remainder) : shuffled;
    assignable.forEach((p, i) => {
      const u = userList[i % userList.length];
      assignments[u].push(p);
    });
    return { assignments, leftover };
  };

  const previewReservedSlots = () => {
    if (!users.length || !players.length) {
      alert("Add users and players first.");
      return;
    }
    // Count-only preview: leftover count = players % users
    const remainder = players.length % users.length;
    setReservedSlotsRemaining(remainder);
    // Keep reservedSelections as-is; user can add more slots or clear all later
  };

  const assignReservedSlotToUser = (user, amountStr) => {
    const amount = Number(amountStr);
    if (!user) {
      alert("Select a user.");
      return;
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Enter a valid contribution amount.");
      return;
    }
    if (reservedSlotsRemaining <= 0) {
      alert("No reserved slots left to assign.");
      return;
    }

    setReservedSelections((prev) => {
      const next = { ...prev };
      if (!next[user]) next[user] = { count: 0, total: 0 };
      next[user] = {
        count: next[user].count + 1,
        total: next[user].total + amount,
      };
      return next;
    });
    setReservedSlotsRemaining((n) => Math.max(0, n - 1));
  };

  const createSweeps = () => {
    if (!users.length || !players.length) {
      alert("Add users and players first.");
      return;
    }

    const sweepNames = ["Norm Smith", "First Goal"];
    const nextSweeps = {};

    sweepNames.forEach((name) => {
      const { assignments, leftover } = assignPlayersEvenlyWithLeftover(players, users);

      // Fill reserved slots from THIS sweep's pool (so both sweeps get their extras)
      let pool = [...leftover];
      const finalAssignments = { ...assignments };
      users.forEach((u) => {
        if (!finalAssignments[u]) finalAssignments[u] = [];
      });

      Object.entries(reservedSelections).forEach(([u, info]) => {
        const need = info.count;
        for (let i = 0; i < need && pool.length > 0; i++) {
          finalAssignments[u] = [...finalAssignments[u], pool.shift()];
        }
      });

      // Per-user contributions (base + extras)
      const userContributions = {};
      users.forEach((u) => {
        const extra = reservedSelections[u]?.total || 0;
        userContributions[u] = contribution + extra;
      });
      const potBonus = Object.values(reservedSelections).reduce((sum, v) => sum + (v?.total || 0), 0);

      nextSweeps[name] = {
        assignments: finalAssignments,
        pool,
        userContributions,
        potBonus,
        winner: null,
      };
    });

    setSweeps(nextSweeps);
    // Reset preview/selection after commit so we don't double-apply on next create
    setReservedSlotsRemaining(0);
    setReservedSelections({});
  };

  const declareWinner = (sweepName, player) => {
    const name = (player || "").trim();
    if (!name) return;

    setSweeps((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sweep = next[sweepName];
      if (!sweep) return prev;

      let winningUser = null;
      for (const [u, list] of Object.entries(sweep.assignments)) {
        if (list.includes(name)) {
          winningUser = u;
          break;
        }
      }
      if (!winningUser) {
        winningUser = sweep.pool.includes(name) ? "No one (player in pool)" : "Unknown player";
      }
      sweep.winner = { player: name, user: winningUser };
      return next;
    });
  };

  // Post-creation: add money to pot (does not assign players)
  const addMoneyToSweep = (sweepName, user, amountStr) => {
    const amount = Number(amountStr);
    if (!sweepName || !user || !amount || isNaN(amount) || amount <= 0) {
      alert("Pick sweep, user, and a valid amount.");
      return;
    }
    setSweeps((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sweep = next[sweepName];
      if (!sweep) return prev;
      sweep.userContributions[user] = (sweep.userContributions[user] || 0) + amount;
      sweep.potBonus = (sweep.potBonus || 0) + amount;
      return next;
    });
  };

  const clearAll = () => {
    localStorage.clear();
    setUsers([]);
    setPlayers([]);
    setContribution(10);
    setReservedSlotsRemaining(0);
    setReservedSelections({});
    setSweeps({});
    setNewUser("");
    setNewPlayer("");
    setHtmlSnippet("");
  };

  // Small UI state for adding post-creation money
  const [moneySweep, setMoneySweep] = useState("Norm Smith");
  const [moneyUser, setMoneyUser] = useState("");
  const [moneyAmount, setMoneyAmount] = useState("");

  return (
    <div className="app-container">
      <h1 className="title">AFL Sweepstake App</h1>

      {/* Setup cards */}
      <div className="card-grid">
        <div className="card">
          <h2>Players</h2>
          <textarea
            placeholder="Paste AFL HTML here"
            value={htmlSnippet}
            onChange={(e) => setHtmlSnippet(e.target.value)}
            rows={6}
            style={{ width: "100%" }}
          />
          <button onClick={handleExtractPlayers}>Extract Players</button>
          <div style={{ marginTop: 8 }}>
            <input
              placeholder="Manual player name"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
            />
            <button onClick={addPlayer}>Add Player</button>
          </div>
          <p style={{ marginTop: 8, fontStyle: "italic" }}>
            Total players: {players.length}
          </p>
          <ul>{players.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>

        <div className="card">
          <h2>Users</h2>
          <input
            placeholder="Enter user name"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
          />
          <button onClick={addUser}>Add User</button>
          <p style={{ marginTop: 8, fontStyle: "italic" }}>
            Total users: {users.length}
          </p>
          <ul>{users.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>

        <div className="card">
          <h2>Setup</h2>
          <label>
            Base Contribution: $
            <input
              type="number"
              value={contribution}
              onChange={(e) => setContribution(Number(e.target.value))}
              style={{ width: 100, marginLeft: 8 }}
            />
          </label>
          <div style={{ marginTop: 12 }}>
            <button onClick={previewReservedSlots}>Preview Reserved Slots</button>
            <button onClick={createSweeps} style={{ marginLeft: 8 }}>
              Create Sweeps
            </button>
          </div>
          <button className="danger-btn" onClick={clearAll} style={{ marginTop: 12 }}>
            Clear All Data
          </button>
        </div>
      </div>

      {/* Reserved slots (preview + selection) */}
      {(reservedSlotsRemaining > 0 || Object.keys(reservedSelections).length > 0) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Reserved Slots</h2>
          <p>
            {reservedSlotsRemaining} slot(s) unassigned.
            Assign a hidden slot to a user with a $ amount. On creation, each sweep will
            pull that many players for that user from its own pool.
          </p>
          {users.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select id="reserve-user">
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input id="reserve-amount" type="number" placeholder="$ amount" style={{ width: 120 }} />
              <button
                onClick={() =>
                  assignReservedSlotToUser(
                    document.getElementById("reserve-user").value,
                    document.getElementById("reserve-amount").value
                  )
                }
              >
                Assign Slot
              </button>
            </div>
          )}

          {Object.keys(reservedSelections).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3>Locked Extras</h3>
              <ul>
                {Object.entries(reservedSelections).map(([u, v]) => (
                  <li key={u}>
                    {u}: {v.count} slot(s), ${v.total}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add money after sweeps exist */}
      {Object.keys(sweeps).length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Add Money to Pot (After Creation)</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={moneySweep} onChange={(e) => setMoneySweep(e.target.value)}>
              {Object.keys(sweeps).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select value={moneyUser} onChange={(e) => setMoneyUser(e.target.value)}>
              <option value="">Select user…</option>
              {users.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="number"
              placeholder="$ amount"
              value={moneyAmount}
              onChange={(e) => setMoneyAmount(e.target.value)}
              style={{ width: 120 }}
            />
            <button onClick={() => { addMoneyToSweep(moneySweep, moneyUser, moneyAmount); setMoneyAmount(""); }}>
              Add
            </button>
          </div>
          <p style={{ marginTop: 6, fontStyle: "italic" }}>
            This increases a sweep’s pot and the selected user’s contribution; it does not assign extra players.
          </p>
        </div>
      )}

      {/* Sweeps display */}
      {Object.keys(sweeps).length > 0 && (
        <div className="sweep-grid" style={{ marginTop: 16 }}>
          {Object.entries(sweeps).map(([sweepName, sweep]) => {
            const totalPot = Object.values(sweep.userContributions || {}).reduce((a, b) => a + b, 0);
            return (
              <div key={sweepName} className="card results-card">
                <h2>{sweepName}</h2>
                <p>
                  Base Pot: <strong>${users.length * contribution}</strong><br />
                  Extra: <strong>${sweep.potBonus}</strong><br />
                  Total Pot: <strong>${totalPot}</strong>
                </p>

                <div style={{ margin: "8px 0" }}>
                  <input placeholder="Winner player name" id={`winner-${sweepName}`} />
                  <button
                    onClick={() =>
                      declareWinner(sweepName, document.getElementById(`winner-${sweepName}`).value)
                    }
                    style={{ marginLeft: 8 }}
                  >
                    Declare Winner
                  </button>
                </div>

                {sweep.winner && (
                  <p>
                    🏆 Winner: <strong>{sweep.winner.user}</strong> ({sweep.winner.player})
                  </p>
                )}

                {Object.entries(sweep.assignments).map(([u, list]) => (
                  <div key={u} style={{ marginTop: 10 }}>
                    <strong>
                      {u} — {list.length} player(s) — ${sweep.userContributions?.[u] ?? contribution}
                    </strong>
                    <ul>
                      {list.map((p, i) => (
                        <li key={`${sweepName}-${u}-${i}-${p}`}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div style={{ marginTop: 10 }}>
                  <h3>Unused Players</h3>
                  {sweep.pool.length === 0 ? <p>None</p> : (
                    <ul>
                      {sweep.pool.map((p, i) => <li key={`${sweepName}-pool-${i}-${p}`}>{p}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
