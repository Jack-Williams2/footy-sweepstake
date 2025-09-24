import React from "react";

const SweepstakeSetup = ({ players, users, contribution, setContribution, setAssignments }) => {
  const commitSweep = () => {
    if (!players.length || !users.length) {
      alert("Add users and players first!");
      return;
    }

    const assignments = {};
    users.forEach((u) => (assignments[u] = []));

    // Evenly assign players
    players.forEach((player, idx) => {
      const user = users[idx % users.length];
      assignments[user].push(player);
    });

    setAssignments(assignments);
  };

  return (
    <div>
      <h2>Sweepstake Setup</h2>
      <label>
        Contribution Amount: $
        <input
          type="number"
          value={contribution}
          onChange={(e) => setContribution(parseFloat(e.target.value))}
        />
      </label>
      <br />
      <button onClick={commitSweep}>Commit Sweep</button>
    </div>
  );
};

export default SweepstakeSetup;
