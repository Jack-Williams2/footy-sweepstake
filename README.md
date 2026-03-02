# footy-sweepstake
Hobby react application that generates a sweep for a given game of footy. Requires the copying/pasting of html code from the afl website to parse the relevant game, then allows the addition of players with an amount, plus gives the modification of the game as desired.

## Usage ##

The relevant segment of the team lineups can be copied as raw html and copied into the setup section, alternatively the players can be added manually. The number of participating players are then added, and a dollar amount is determined for each player. If their is not an even divisor of players between participants, the remainder of players can be purchased and assigned to participants manually. The team lineup is stored on the local machine, hence nothing is persisted in a database anywhere (this could be changed, but it simplifies the usage and avoids the need of signing in).