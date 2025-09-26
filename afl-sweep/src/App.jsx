// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * AFL Sweepstake App — robust reserved-slot handling + localStorage
 */

function App() {
  // Core setup state
  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [contribution, setContribution] = useState(10);

  // Reserved slots (pre-creation)
  const [reservedSelections, setReservedSelections] = useState({});
  const [showReservedPreview, setShowReservedPreview] = useState(false);
  const [reserveUser, setReserveUser] = useState("");
  const [reserveAmount, setReserveAmount] = useState("");

  // Sweeps
  const [sweeps, setSweeps] = useState({});

  // Hydration guard
  const [hydrated, setHydrated] = useState(false);

  // ---------- helpers for reservedSelections backward-compat ----------
  const getUserSlots = (rs, user) => {
    const entry = rs?.[user];
    if (Array.isArray(entry)) return entry;
    if (entry && typeof entry === "object") {
      const count = Number(entry.count) || 0;
      const total = Number(entry.total) || 0;
      if (count <= 0) return [];
      const per = count ? total / count : 0;
      return Array.from({ length: count }, (_, i) => ({
        id: `migrated-${user}-${i}`,
        amount: per,
      }));
    }
    return [];
  };

  const normalizeReservedSelections = (rs) => {
    const out = {};
    Object.keys(rs || {}).forEach((u) => {
      const arr = getUserSlots(rs, u);
      if (arr.length) out[u] = arr;
    });
    return out;
  };

  // ---------- Load from localStorage once ----------
  useEffect(() => {
    try {
      const lsUsers = JSON.parse(localStorage.getItem("users") || "[]");
      const lsPlayers = JSON.parse(localStorage.getItem("players") || "[]");
      const lsContribution = JSON.parse(localStorage.getItem("contribution") || "10");
      const lsReservedSelections = JSON.parse(localStorage.getItem("reservedSelections") || "{}");
      const lsShowReservedPreview = JSON.parse(localStorage.getItem("showReservedPreview") || "false");
      const lsSweeps = JSON.parse(localStorage.getItem("sweeps") || "{}");

      if (Array.isArray(lsUsers)) setUsers(lsUsers);
      if (Array.isArray(lsPlayers)) setPlayers(lsPlayers);
      if (typeof lsContribution === "number") setContribution(lsContribution);
      setReservedSelections(normalizeReservedSelections(lsReservedSelections || {}));
      setShowReservedPreview(Boolean(lsShowReservedPreview));
      if (lsSweeps && typeof lsSweeps === "object") setSweeps(lsSweeps);
    } catch {
      // keep defaults
    } finally {
      setHydrated(true);
    }
  }, []);

  // ---------- Persist to localStorage ----------
  const persist = (key, value) => {
    if (!hydrated) return;
    localStorage.setItem(key, JSON.stringify(value));
  };
  useEffect(() => persist("users", users), [users, hydrated]);
  useEffect(() => persist("players", players), [players, hydrated]);
  useEffect(() => persist("contribution", contribution), [contribution, hydrated]);
  useEffect(() => persist("reservedSelections", reservedSelections), [reservedSelections, hydrated]);
  useEffect(() => persist("showReservedPreview", showReservedPreview), [showReservedPreview, hydrated]);
  useEffect(() => persist("sweeps", sweeps), [sweeps, hydrated]);

  // ---------- Derived reserved slots ----------
  const remainder = useMemo(() => {
    if (!users.length || !players.length) return 0;
    return players.length % users.length;
  }, [users.length, players.length]);

  const totalAssignedSlots = useMemo(() => {
    return users.reduce((sum, u) => sum + getUserSlots(reservedSelections, u).length, 0);
  }, [users, reservedSelections]);

  const reservedSlotsRemaining = Math.max(0, remainder - totalAssignedSlots);

  const perUserReservedTotals = useMemo(() => {
    const totals = {};
    users.forEach((u) => {
      const arr = getUserSlots(reservedSelections, u);
      totals[u] = arr.reduce((s, slot) => s + (Number(slot.amount) || 0), 0);
    });
    return totals;
  }, [users, reservedSelections]);

  // ---------- Setup helpers ----------
  const parsePlayersFromHtml = (html) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const entryEls = Array.from(
        doc.querySelectorAll(
          ".team-lineups__player-entry, .team-lineups__player-entry--home-team, .team-lineups__player-entry--away-team"
        )
      );
      const names = new Set();
      entryEls.forEach((el) => {
        const anchor = el.tagName?.toLowerCase() === "a" ? el : el.querySelector?.("a");
        const title = anchor?.getAttribute?.("title");
        if (title) {
          names.add(title.split(".")[0].trim());
          return;
        }
        const aria = el.getAttribute?.("aria-label");
        if (aria) names.add(aria.split(".")[0].trim());
      });
      return Array.from(names);
    } catch {
      return [];
    }
  };

  const handleExtractPlayers = () => {
    const parsed = parsePlayersFromHtml(htmlSnippet);
    if (!parsed.length) return alert("No players found in pasted HTML");
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

  const removePlayerFromGlobalPool = (name) => {
    setPlayers((prev) => prev.filter((p) => p !== name));
  };

  const previewReservedSlots = () => {
    if (!users.length || !players.length) {
      alert("Add at least one user and one player first.");
      return;
    }
    setShowReservedPreview(true);
  };

  const genId = () => Math.random().toString(36).slice(2, 10);

  const assignReservedSlotToUser = () => {
    const user = reserveUser;
    const amount = Number(reserveAmount);
    if (!user) return alert("Choose a user");
    if (!amount || isNaN(amount) || amount <= 0) return alert("Enter a valid $ amount");
    if (reservedSlotsRemaining <= 0) return alert("No reserved slots left");

    setReservedSelections((prev) => {
      const base = normalizeReservedSelections(prev);
      const arr = getUserSlots(base, user).slice();
      arr.push({ id: genId(), amount });
      return { ...base, [user]: arr };
    });
    setReserveAmount("");
  };

  const undoOneReservedSlotForUser = (user) => {
    setReservedSelections((prev) => {
      const base = normalizeReservedSelections(prev);
      const arr = getUserSlots(base, user).slice();
      if (!arr.length) return prev;
      arr.pop();
      const next = { ...base };
      if (arr.length) next[user] = arr;
      else delete next[user];
      return next;
    });
  };

  // ---------- Create sweeps ----------
  const assignPlayersEvenlyWithLeftover = (playerList, userList) => {
    const shuffled = [...playerList].sort(() => Math.random() - 0.5);
    const assignments = {};
    userList.forEach((u) => (assignments[u] = []));
    const rem = userList.length ? shuffled.length % userList.length : 0;
    const leftover = rem > 0 ? shuffled.slice(-rem) : [];
    const assignable = rem > 0 ? shuffled.slice(0, shuffled.length - rem) : shuffled;
    assignable.forEach((p, i) => {
      const u = userList[i % userList.length];
      assignments[u].push(p);
    });
    return { assignments, leftover };
  };

  const createSweeps = () => {
    if (!users.length || !players.length) {
      alert("Add users and players first.");
      return;
    }

    const names = ["Norm Smith", "First Goal"];
    const built = {};

    names.forEach((name) => {
      const { assignments, leftover } = assignPlayersEvenlyWithLeftover(players, users);
      let pool = [...leftover];
      const finalAssignments = { ...assignments };
      users.forEach((u) => {
        if (!finalAssignments[u]) finalAssignments[u] = [];
      });

      users.forEach((u) => {
        const slots = getUserSlots(reservedSelections, u);
        for (let i = 0; i < slots.length && pool.length > 0; i++) {
          finalAssignments[u] = [...finalAssignments[u], pool.shift()];
        }
      });

      const userContributions = {};
      users.forEach((u) => {
        userContributions[u] = contribution + (perUserReservedTotals[u] || 0);
      });
      const potBonus = Object.values(perUserReservedTotals).reduce((s, v) => s + v, 0);

      built[name] = {
        assignments: finalAssignments,
        pool,
        userContributions,
        potBonus,
        winner: null,
      };
    });

    setSweeps(built);
    setReservedSelections({});
    setShowReservedPreview(false);
    setReserveUser("");
    setReserveAmount("");
  };

  const removePlayerFromUser = (sweepName, user, player) => {
    setSweeps((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sweep = next[sweepName];
      if (!sweep) return prev;
      sweep.assignments[user] = sweep.assignments[user].filter((p) => p !== player);
      sweep.pool.push(player);
      return next;
    });
  };

  const movePlayerBetweenUsers = (sweepName, fromUser, toUser, player) => {
    if (fromUser === toUser) return;
    setSweeps((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sweep = next[sweepName];
      if (!sweep) return prev;
      sweep.assignments[fromUser] = sweep.assignments[fromUser].filter((p) => p !== player);
      sweep.assignments[toUser].push(player);
      return next;
    });
  };

  const assignPoolPlayerToUser = (sweepName, user, player) => {
    setSweeps((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sweep = next[sweepName];
      if (!sweep) return prev;
      sweep.pool = sweep.pool.filter((p) => p !== player);
      sweep.assignments[user].push(player);
      return next;
    });
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

  const [moneySweep, setMoneySweep] = useState("Norm Smith");
  const [moneyUser, setMoneyUser] = useState("");
  const [moneyAmount, setMoneyAmount] = useState("");

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
    setMoneyAmount("");
  };

  const clearAll = () => {
    localStorage.clear();
    setUsers([]);
    setPlayers([]);
    setContribution(10);
    setReservedSelections({});
    setShowReservedPreview(false);
    setSweeps({});
    setNewUser("");
    setNewPlayer("");
    setHtmlSnippet("");
    setReserveUser("");
    setReserveAmount("");
    setMoneySweep("Norm Smith");
    setMoneyUser("");
    setMoneyAmount("");
  };

  return (
    <div className="app-container">
      <h1 className="title">AFL Sweepstake App</h1>

      {/* Setup (always visible) */}
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
          <p className="muted-text">Total players: {players.length}</p>
          <ul>
            {players.map((p) => (
              <li key={p}>
                {p}{" "}
                <button
                  title="Remove from pool (pre-creation only affects future sweeps)"
                  onClick={() => removePlayerFromGlobalPool(p)}
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Users</h2>
          <input
            placeholder="Enter user name"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
          />
          <button onClick={addUser}>Add User</button>
          <p className="muted-text">Total users: {users.length}</p>
          <ul>{users.map((u) => <li key={u}>{u}</li>)}</ul>
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
              Create / Re-create Sweeps
            </button>
          </div>
          <button className="danger-btn" onClick={clearAll} style={{ marginTop: 12 }}>
            Clear All Data
          </button>
          <p className="muted-text">
            Setup changes affect the next time you click "Create / Re-create Sweeps". Existing sweeps won’t auto-update.
          </p>
        </div>
      </div>

      {/* Reserved slots */}
      {(showReservedPreview || Object.keys(reservedSelections).length > 0) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Reserved Slots</h2>
          <p>
            Remainder: <b>{remainder}</b> — Assigned: <b>{totalAssignedSlots}</b> — Remaining:{" "}
            <b>{reservedSlotsRemaining}</b>
          </p>
          {reservedSlotsRemaining === 0 && remainder > 0 && (
            <p className="warning-text">All available extra slots are already assigned.</p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={reserveUser} onChange={(e) => setReserveUser(e.target.value)}>
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="$ amount"
              value={reserveAmount}
              onChange={(e) => setReserveAmount(e.target.value)}
              style={{ width: 120 }}
            />
            <button disabled={reservedSlotsRemaining <= 0} onClick={assignReservedSlotToUser}>
              Assign Slot
            </button>
          </div>

          {Object.keys(reservedSelections).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3>Locked Extras</h3>
              <ul>
                {users.map((u) => {
                  const slots = getUserSlots(reservedSelections, u);
                  if (!slots.length) return null;
                  const sum = slots.reduce((s, sl) => s + (Number(sl.amount) || 0), 0);
                  return (
                    <li key={u}>
                      {u}: {slots.length} slot(s), ${sum}{" "}
                      <button onClick={() => undoOneReservedSlotForUser(u)} style={{ marginLeft: 8 }}>
                        Undo one
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Post-creation controls */}
      {Object.keys(sweeps).length > 0 && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <h2>Add Money to Pot (After Creation)</h2>
            <AddMoneyControls
              sweeps={sweeps}
              users={users}
              onAdd={(sweepName, user, amount) => addMoneyToSweep(sweepName, user, amount)}
            />
            <p className="muted-text">
              This increases a sweep’s pot and the selected user’s contribution; it does not assign extra players.
            </p>
          </div>

          <div className="sweep-grid" style={{ marginTop: 16 }}>
            {Object.entries(sweeps).map(([sweepName, sweep]) => {
              const totalPot = Object.values(sweep.userContributions || {}).reduce((a, b) => a + b, 0);
              return (
                <div key={sweepName} className="card results-card">
                  <h2>{sweepName}</h2>
                  <p>
                    Base Pot: <strong>${Object.keys(sweep.userContributions || {}).length * contribution}</strong><br />
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
                        {list.map((p) => (
                          <li key={`${sweepName}-${u}-${p}`}>
                            {p}{" "}
                            <button title="Remove to pool" onClick={() => removePlayerFromUser(sweepName, u, p)}>
                              ❌ Remove
                            </button>
                            <div style={{ display: "inline-flex", alignItems: "center", marginLeft: 6 }}>
                              <select id={`move-${sweepName}-${u}-${p}`} defaultValue="">
                                <option value="">Move to…</option>
                                {users.filter((x) => x !== u).map((other) => (
                                  <option key={other} value={other}>{other}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const targetUser = document.getElementById(`move-${sweepName}-${u}-${p}`).value;
                                  if (targetUser) {
                                    movePlayerBetweenUsers(sweepName, u, targetUser, p);
                                  }
                                }}
                                style={{ marginLeft: 4 }}
                              >
                                Move
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div style={{ marginTop: 10 }}>
                    <h3>Unused Players</h3>
                    {sweep.pool.length === 0 ? <p>None</p> : (
                      <ul>
                        {sweep.pool.map((p) => (
                          <li key={`${sweepName}-pool-${p}`}>
                            {p}{" "}
                            <select id={`assign-${sweepName}-${p}`}>
                              {users.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                assignPoolPlayerToUser(
                                  sweepName,
                                  document.getElementById(`assign-${sweepName}-${p}`).value,
                                  p
                                )
                              }
                              style={{ marginLeft: 6 }}
                            >
                              Assign
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AddMoneyControls({ sweeps, users, onAdd }) {
  const sweepNames = Object.keys(sweeps);
  const [sweep, setSweep] = useState(sweepNames[0] || "");
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!sweep && sweepNames.length) setSweep(sweepNames[0]);
  }, [sweep, sweepNames]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select value={sweep} onChange={(e) => setSweep(e.target.value)}>
        {sweepNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <select value={user} onChange={(e) => setUser(e.target.value)}>
        <option value="">Select user…</option>
        {users.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <input
        type="number"
        placeholder="$ amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: 120 }}
      />
      <button onClick={() => { onAdd(sweep, user, amount); }}>
        Add
      </button>
    </div>
  );
}

export default App;
