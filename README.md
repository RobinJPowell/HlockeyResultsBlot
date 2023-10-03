# HlockeyResultsBlot

A Discord bot to allow you to request infomation about Hlockey.

## Commands

- !results - Returns the most recent game results.
- !standings - Returns the current standings.
- !playoffs - Returns the playoff picture during the regular season, and playoff standings during the playoffs.
- !team [teamName] - Returns a team's roster.  Works with partial matches, so "!team nice" would return the roster of the Nice Backflippers.  When executed without a team name from a team's chat channel on the official Hlockey Discord, returns that team's roster.
- !stats - Returns the top 5 players in some basic stats (goalsScored, goalsConceded, interceptions, takeaways).  The stats command has a lot of options, so has its own section below.  This command has the potential to return a lot of data, so will only work within the nominated stats channels.

### The !stats Command

The !stats command can be run with a number of options:

    !stats [stat/statCategory] [teams/teamName] [topX/bottomX/all] [season] [playoffs]

Firstly you can supply the stat that you want, or a category of stats.  Categories of stats return multiple individual stats together.  Full lists of all stat categories and stats, as well as any restrictions which apply to them, are below.

By default the stats returned are for players.  If you want to see the stats for teams, simply supply "teams".  If you want to see the stats of players within a particular team, supply the team name.  Like the !team command this works on partial matches, you don't need to type "Dawson City Imposters", just "city" will do.

By default the stats returned are a top 5.  You can have as many results returned as you like, and can also see the worst performers as well as the best, by using "topX" or "bottomX".  So if you wanted a top 10, simply supply "top10", or a bottom 13, "bottom13".  If you ask for more records than are available, you will get an error back.  "top123456" will never work, if you just want everything use "all" instead.  Be warned, "all" has the potential to return a lot of data.

By default the stats returned are for the current season.  If you wish to see stats for a different season, just supply the season number.  Currently stats are only available from season 4 onwards.

By default the stats returned are for the regular season.  To see stats for the playoffs, just supply the word "playoffs".

None of these options are mandatory, you can supply all of them, or none, or any mixture depending on what information you want.  You also don't need to supply them in any particular order.  So if you want to know the top 20 most accurate passers for the current season:

    !stats passcompletionpercentage top20

Or the worst 3 teams when it came to retaining the puck in the season 5 playoffs:

    !stats pucklosspercentage bottom3 teams 5 playoffs

Or how many punches the players of the Sydney Thinkers have thrown:

    !stats punchesthrown think all

#### Stat Categories

- offence - Returns faceoffsWon, passesCompleted and goalsScored.
- defence - Returns interceptions, hits and takeaways.
- games - Returns gamesPlayed, gamesWon and winPercentage.
- overtime - Returns overtimeGames, overtimeGamesWon, overtimeWinPercentage and overtimeGamesPercentage.
- faceoffs - Returns faceoffsTaken, faceoffsWon and faceoffWinPercentage.
- passing - Returns passesAttempted, passesCompleted, passCompletionPercentage, passesAttemptedPerGame and passesCompletedPerGame.
- intercepting - Returns interceptions and interceptionsPerGame
- hitting - Returns hits, takeaways, takeawayPercentage, hitsPerGame and TakeawaysPerGame.
- retention - Returns hitsTaken, pucksLost, puckLossPercentage, hitsTakenPerGame and pucksLostPerGame.
- scoring - Returns shotsTaken, goalsScored, scoringPercentage, goalsPerGame and shotsPerGame.
- saves - Returns goalsConceded, shotsFaced, shotsBlockedGoalie, savePercentage, shotsFacedPerGame, savesPerGame and goalsConcededPerGame.  This collection is only available for players, not teams.
- blocking - Returns goalsConceded, shotsFaced, shotsFacedPerGame, shotsBlockedDefence, shotsBlocked, shotsBlockedPercentage, shotsBlockedPerGame and goalsConcededPerGame.  This collection will only return shotsBlockedDefence and shotsBlockedPerGame for players, and will return all stats except shotsBlockedDefence for teams.
- fighting - Returns fights, fightRecord, fightPercentageRecord, fightsPerGame and fightWinsPerGame.
- punching - Returns punchesThrown, punchesLanded, punchLandedPercentage, punchesThrownPerGame and punchesLandedPerGame.
- punched - Returns punchesTaken, punchesBlocked, punchBlockedPercentage, punchesTakenPerGame and punchesBlockedPerGame.
- weather - Returns timesSweptAway and timesChickenedOut.  This collection is only available for players, not teams.

#### Stats

- gamesPlayed - Returns the number of games played.
- gamesWon - Returns the number of games won, with the win percentage alongside it.
- winPercentage - Returns the percentage of games won, with the number of games played alongside it.
- overtimeGames - Returns the number of games played which have gone to overtime, with the win percentage of these games alongside it.
- overtimeWinPercentage - Returns the percentage of games going to overtime which have been won, with the number of games going to overtime alongside it.
- overtimeGamesPercentage - Returns the percentage of games played which have gone to overtime, with the number of games played alongside it.
- faceoffsTaken - Returns the number of faceoffs taken.
- faceoffsWon - Returns the number of faceoffs won, with the faceoff win percentage alongside it.
- faceoffWinPercentage - Returns the percentage of faceoffs won, with the number of faceoffs taken alongside it.  When returning stats for players, a player must have taken at least 10 faceoffs to have their win percentage counted.
- passesAttempted - Returns the number of passes attempted.
- passesCompleted - Returns the number of passes completed, with the pass completion percentage alongside it.
- passCompletionPercentage - Returns the percentage of passes completed, with the number of passes attempted alongside it.  A player must have attempted at least 10 passes to have their pass completion percentage counted.
- passesAttemptedPerGame - Returns the number of passes attempted per game played, with the number of games played alongside it.
- passesCompletedPerGame - Returns the number of passes completed per game played, with the number of games played alongside it.
- interceptions - Returns the number of interceptions made.
- interceptionsPerGame - Returns the number of interceptions made per game played, with the number of games played alongside it.
- hits - Returns the number of hits made.
- takeaways - Returns the number of pucks taken away after a hit, with the takeaway percentage alongside it.
- takeawayPercentage - Returns the percentage of hits which resulted in a takeaway, with the number of hits alongside it.  A player must have made at least 10 hits to have their takeaway percentage counted.
- hitsPerGame - Returns the number of hits made per game played, with the number of games played alongside it.
- takeawaysPerGame - Returns the number of pucks taken away per game played, with the number of games played alongside it.
- hitsTaken - Returns the number of hits taken.
- pucksLost - Returns the number of times the puck is lost after taking a hit, with the puck loss percentage alongside it, with lower numbers considered better.  A player must have taken at least 10 hits for their pucks lost to be counted.
- puckLossPercentage - Returns the percentage of hits taken which resulted in losing the puck, with the number of hits taken alongside it, with lower numbers considered better.  A player must have taken at least 10 hits to have their puck loss percentage counted.
- hitsTakenPerGame - Returns the number of hits taken per game played, with the number of games played alongside it.
- pucksLostPerGame - Returns the number of pucks lost per game played, with the number of games played alongside it, with lower numbers considered better.  A player must have taken at least 10 hits for their pucks lost per game to be counted.
- shotsTaken - Returns the number of shots taken.
- goalsScored - Returns the number of goals scored, with the scoring percentage alongside it.
- scoringPercentage - Returns the percentage of shots which resulted in a goal, with the number of shots taken alongside it.  A player must have taken at least 10 shots for their scoring percentage to be counted.
- goalsPerGame - Returns the number of goals scored per game played, with the number of games played alongside it.
- shotsPerGame - Returns the number of shots taken per game played, with the number of games played alongside it.
- goalsConceded - Returns the number of goals conceded, with lower numbers considered better.  This has the shots blocked percentage alongside it for teams, and the save percentage alongside it for players.  A player must have faced at least 10 shots for their goals conceded to be counted, and only the Goalie position is considered able to concede a goal.
- shotsFaced - Returns the number of shots faced.  For players this only counts shots faced while playing Goalie, while for teams it counts all shots against.
- shotsBlockedGoalie - Returns the number of shots blocked while playing in goal, with the save percentage alongside it.  This stat is only available for players.
- savePercentage - Returns the percentage of faced shots blocked while playing Goalie, with the number of shots faced alongside it.  This stat is only available for players and a player must have faced at least 10 shots for save percentage to be counted.
- shotsFacedPerGame - Returns the number of shots faced per game played, with the number of games played alongside it.  For players this only counts shots faced while playing Goalie, while for teams it counts all shots against.
- savesPerGame - Returns the number of shots blocked while playing Goalie per game played, with the number of games played alongside it.  This stat is only available for players.
- shotsBlockedDefence - Returns the number of shots blocked while playing in a position other than Goalie.  This stat is only available for players.
- shotsBlocked - Returns the total number of shots blocked by players in any position.  This stat is only availble for teams.
- shotsBlockedPercentage - Returns the percentage of faced shots blocked by players in any position, with the number of shots faced alongside it.  This stat is only available for teams.
- shotsBlockedPerGame - Returns the number of shots blocked per game played, with the number of shots blocked alongside it.  For players this only counts shots blocked while playing in a position other than Goalie, while for teams all shots blocked by any position are counted.
- goalsConcededPerGame - Returns the number of goals conceded per game played, with the number of games played alongside it, with lower numbers considered better.  Only the Goalie position is considered able to concede a goal, and a player must have faced at least 10 shots for their goals conceded per game to be counted.
- fights - Returns the number of fights joined.
- fightsWon - Returns the number of fights won, with the percentage of fights won alongside it.
- fightsDrawn - Returns the number of fights which were a draw, with the percentage of fights drawn alongside it.
- fightsLost - Returns the number of fights lost, with the percentage of fights lost alongside it.
- fightWinPercentage - Returns the percentage of fights that were won, with the number of fights joined alongside it.  A player must have joined at least 5 fights for fight win percentage to be counted.
- fightDrawPercentage - Returns the percentage of fights that were a draw, with the number of fights joined alongside it.  A player must have joined at least 5 fights for fight draw percentage to be counted.
- fightLossPercentage - Returns the percentage of fights that were lost, with the number of fights joined alongside it.    A player must have joined at least 5 fights for fight loss percentage to be counted.
- fightsPerGame - Returns the number of fights joined per game played, with the number of games played alongside it.
- fightWinsPerGame - Returns the number of fights won per game played, with the number of games played alongside it.
- fightDrawsPerGame - Returns the number of fights that were a draw per game played, with the number of games played alongside it.
- fightLossesPerGame - Returns the number of fights that were lost per game played, with the number of games played alongside it.
- fightRecord - Returns the Win-Loss-Draw record for fights.
- fightPercentageRecord - Returns the Win-Loss-Draw percentage record for fights.  Note these figures are rounded so may not add up to exactly 100%.
- punchesThrown - Returns the number of punches thrown in fights.
- punchesLanded - Returns the number of punches which hit the opponent, with the percentage of punches landed alongside it.
- punchLandedPercentage - Returns the percentage of punches thrown which hit the opponent, with the number of punches thrown alongside it.  A player must have thrown at least 10 punches for punch landed percentage to be counted.
- punchesThrownPerGame - Returns the number of punches thrown per game played, with the number of games played alongside it.
- punchesLandedPerGame - Returns the number of punches landed per game played, with the number of games played alongside it.
- punchesTaken - Returns the number of times a player was punched
- punchesBlocked - Returns the number of punches taken that were blocked, with the punch blocked percentage alongside it.
- punchBlockedPercentage - Returns the percentage of punches taken that were blocked, with the number of punches taken alongside it.  A player must have taken at least 10 punches for punch blocked percentage to be counted.
- punchesTakenPerGame - Returns the number of punches taken per game, with the number of games played alongside it.
- punchesBlockedPerGame - Returns the number of punches blocked per game, with the number of games played alongside it.
- timesSweptAway - Returns the number of times a player has been swept away by the waves.  This stat is only available for players.
- timesChickenedOut - Returns the number of times a player has chickened out and left a game.  This stats is only available for players.

## Admin Only Commands

These commands can only be executed by users who have been added to the list of admin user IDs.

- !loadstats [seasonNumber] [playoffs] - Loads log.txt game log files from the gameLogs directory into the stats table for the supplied season number.  The log files must be in the folder structure used by the season archive zip file available from the Hlockey Discord.  If the games are from the playoffs supply "true", otherwise "false".
- !populaterosters - Deletes all team rosters from the database and replaces them with whatever is present on the Hlockey website.  Should be run at the start of every season as offseason roster changes cannot be tracked by the bot, and if rosters in the database get out of line with the site for any reason.
- !recalculatestats [seasonNumber] [playoffs] - Recalculates calculated stats for the supplied season number. If you need to recalculate playoff stats supply "true", otherwise "false".  Should be run if any of the percentage stats go wonky.

