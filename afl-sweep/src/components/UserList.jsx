import React, { useState, useEffect } from "react";

const UserList = ({ users, setUsers }) => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem("users")) || [];
    setUsers(savedUsers);
  }, [setUsers]);

  const addUser = () => {
    if (!username.trim()) return;
    const newUsers = [...users, username.trim()];
    setUsers(newUsers);
    localStorage.setItem("users", JSON.stringify(newUsers));
    setUsername("");
  };

  return (
    <div>
      <h2>Add Users</h2>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
      />
      <button onClick={addUser}>Add User</button>
      <ul>
        {users.map((u, i) => (
          <li key={i}>{u}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
