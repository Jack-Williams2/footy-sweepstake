import React, { useState } from "react";
import PlayerList from "./components/PlayerList";
import UserList from "./components/UserList";
import SweepstakeSetup from "./components/SweepstakeSetup";

function App() {
  const [players, setPlayers] = useState([]);
  const [users, setUsers] = useState([]);
  const [contribution, setContribution] = useState(0);
  const [assignments, setAssignments] = useState(null);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>AFL Sweepstake App</h1>
      <PlayerList players={players} setPlayers={setPlayers} />
      <UserList users={users} setUsers={setUsers} />
      <SweepstakeSetup
        players={players}
        users={users}
        contribution={contribution}
        setContribution={setContribution}
        setAssignments={setAssignments}
      />
      {assignments && (
        <div>
          <h2>Sweepstake Assignments</h2>
          {Object.entries(assignments).map(([user, assignedPlayers]) => (
            <div key={user}>
              <strong>{user}:</strong> {assignedPlayers.join(", ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
