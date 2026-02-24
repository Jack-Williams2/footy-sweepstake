import React from "react";

const SweepstakeSetup = ({ contribution, setContribution, createSweeps }) => {
  return (
    <div>
      <h2>Sweepstake Setup</h2>
      <label>
        Contribution Amount (per user): $
        <input
          type="number"
          value={contribution}
          onChange={(e) => setContribution(parseFloat(e.target.value) || 0)}
        />
      </label>
      <br />
      <button onClick={createSweeps}>Create Sweeps</button>
    </div>
  );
};

export default SweepstakeSetup;
