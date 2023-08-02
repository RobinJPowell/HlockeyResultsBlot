//Global Variables
const Discord = require('discord.io');
const GatewayIntentBits = require('discord.io');
const Partials = require('discord.io');
const Logger = require('winston');
const Fs = require('fs');
const MongoDB = require('mongodb').MongoClient;
const Auth = require('./auth.json');
const Axios = require('axios');
const Cheerio = require('cheerio');

const GamesUrl = 'https://hlockey.onrender.com/league/games';
const StandingsUrl = 'https://hlockey.onrender.com/league/standings';
const GamesPerSeason = 114;
const SleepyGifs = Fs.readFileSync('./sleepyGifs.txt').toString().split('|');
const Sponsors = Fs.readFileSync('./sponsors.txt').toString().split('|');

const AdminUser = Fs.readFileSync('./adminUser.txt').toString();
const TeamEmoji = new Map([]);
const TeamChannel = new Map([]);
const WhitespaceRegex = /\s\s+/g;
const WatchChannel = '987112252412923914';

const Teams = ['Antalya Pirates', 'Baden Hallucinations', 'Kópavogur Seals', 'Lagos Soup', 'Pica Acid',
               'Dawson City Impostors', 'Erlangen Ohms', 'Pompei Eruptions', 'Rio de Janeiro Directors', 'Wyrzysk Rockets',
               'Cape Town Transplants', 'Manbij Fish', 'Nagqu Paint', 'Nice Backflippers', 'Orcadas Base Fog',
               'Baghdad Abacuses', 'Jakarta Architects', 'Kyoto Payphones', 'Stony Brook Reapers', 'Sydney Thinkers',
               'Sleepers'];

// Configure Logger settings
Logger.remove(Logger.transports.Console);
Logger.add(new Logger.transports.Console, {
    colorize: true
});
Logger.level = 'debug';

// Initialize Discord Bot
const bot = new Discord.Client({
    token: Auth.token,
    autorun: true,
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

// Connect to database
const MongoClient = new MongoDB('mongodb://127.0.0.1:27017', { family: 4 });
const Database = MongoClient.db('hlockey');

setInterval(statsGatherer, 60000);

bot.on('ready', function (evt) {
    setEmoji();
    setTeamChannels();
    Logger.info('Connected');
    Logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Bot listens for messages that start with `!`
    if (message.substring(0, 1) == '!') {
        Logger.debug('Command ' + message + ' from ' + userID + ' in channel ' + channelID);

        let command = '';
        let parameters = '';

        if (message.indexOf(' ') > 0) {
            command = message.substring(0,message.indexOf(' '));
            parameters = message.substring(message.indexOf(' ') + 1);    
        } else {
            command = message;
        }

        switch (command.toLowerCase()) {
            case '!results':
                isOffSeason((result) => {
                    if (result) {
                        sleeping(channelID);
                    } else {
                        getResults(channelID);
                    }
                });
                break;
            case '!standings':
                isOffSeason((result) => {
                    if (result) {
                        sleeping(channelID);
                    } else {
                        getStandings(channelID, false);
                    }
                });
                break;
            case '!playoffs':
                isOffSeason((result) => {
                    if (result) {
                        sleeping(channelID);
                    } else {
                        playoffPicture(channelID);
                    }
                });
                break;
            case '!team':
                findTeam(channelID, parameters.toLowerCase());
                break;
            case '!loadstats':
                if (userID == AdminUser) {
                    loadStats(parameters.toLowerCase());
                }
                break;
            case '!populaterosters':
                if (userID == AdminUser) {
                    populateRosters();
                }
                break;
        }
    }
});

function setEmoji() {
    TeamEmoji.set(Teams[0], ':ocean:');
    TeamEmoji.set(Teams[1], ':mushroom:');
    TeamEmoji.set(Teams[2], ':seal:');
    TeamEmoji.set(Teams[3], ':bowl_with_spoon:');
    TeamEmoji.set(Teams[4], ':test_tube:');
    TeamEmoji.set(Teams[5], ':knife:');
    TeamEmoji.set(Teams[6], ':aquarius:');
    TeamEmoji.set(Teams[7], ':volcano:');
    TeamEmoji.set(Teams[8], ':cinema:');
    TeamEmoji.set(Teams[9], ':rocket:');
    TeamEmoji.set(Teams[10], ':seedling:');
    TeamEmoji.set(Teams[11], ':tropical_fish:');
    TeamEmoji.set(Teams[12], ':art:');
    TeamEmoji.set(Teams[13], ':arrows_counterclockwise:');
    TeamEmoji.set(Teams[14], ':foggy:');
    TeamEmoji.set(Teams[15], ':abacus:');
    TeamEmoji.set(Teams[16], ':triangular_ruler:');
    TeamEmoji.set(Teams[17], ':vibration_mode:');
    TeamEmoji.set(Teams[18], ':skull:');
    TeamEmoji.set(Teams[19], ':thinking:');
    TeamEmoji.set(Teams[20], ':sleeping_accommodation:');
}

function setTeamChannels() {
    TeamChannel.set('987173855737024522', Teams[0]);
    TeamChannel.set('987174495687147540', Teams[1]);
    TeamChannel.set('987175832902586389', Teams[2]);
    TeamChannel.set('987176850927276032', Teams[3]);
    TeamChannel.set('987177076249468988', Teams[4]);
    TeamChannel.set('987177378667167765', Teams[5]);
    TeamChannel.set('987178525406687262', Teams[6]);
    TeamChannel.set('987178627051434038', Teams[7]);
    TeamChannel.set('987178803992354846', Teams[8]);
    TeamChannel.set('987178965057830972', Teams[9]);
    TeamChannel.set('987179092992462898', Teams[10]);
    TeamChannel.set('987179214677639228', Teams[11]);
    TeamChannel.set('987179372781928469', Teams[12]);
    TeamChannel.set('987179504659202058', Teams[13]);
    TeamChannel.set('987179678479552532', Teams[14]);
    TeamChannel.set('987180068008759357', Teams[15]);
    TeamChannel.set('987180244488290354', Teams[16]);
    TeamChannel.set('987180425254408242', Teams[17]);
    TeamChannel.set('987180600073019422', Teams[18]);
    TeamChannel.set('987180723196805200', Teams[19]);
}

async function isOffSeason(result) {
    await Axios.get(GamesUrl).then((resolve) => {
        const $ = Cheerio.load(resolve.data);

        result($('#content').text().includes('no games right now. it is the offseason.'));         
    }).catch((reject) => {
        Logger.error(`Error checking for offseason: ${reject}`);
        result(false);
    });
}

function sleeping(channelID) {
    bot.sendMessage({
        to: channelID,
        message: `It\'s the offseason. Shhhhhh, James is getting some sleep\n${SleepyGifs[Math.floor(Math.random()*SleepyGifs.length)]}`
    });    
}

async function getResults(channelID) {
    await Axios.get(GamesUrl).then((resolve) => {
        let results = '';
        let gamesProcessed = 0;

        const $ = Cheerio.load(resolve.data);
        const games = $('#content').find('.game');
        const totalGames = games.length;        

        games.each((index, element) => {            
            const resultRaw = $(element).find('.scoreboard').text();
            const afterResults = $(element).text().substring($(element).text().indexOf('Weather:'));
            const weather = afterResults.substring(9,afterResults.indexOf('\n'));
            const afterWeather = afterResults.substring(afterResults.indexOf('\n') + 1).trim();
            const status = afterWeather.substring(0,afterWeather.indexOf('\n')).trim();

            const resultArray = resultRaw.trim().replaceAll('\n','').replace(WhitespaceRegex,'|').split('|');
            const result = `${TeamEmoji.get(resultArray[0])} ${resultArray[0]}  **${resultArray[1]} - ${resultArray[3]}**  ${resultArray[2]} ${TeamEmoji.get(resultArray[2])}`

            results += `> ${result.trim()}\n> :white_sun_rain_cloud: ${weather}     ${(status == 'game in progress' ? '**Game In Progress**' : 'Game Over')}\n\n`;
            gamesProcessed ++;

            if (gamesProcessed == totalGames) {
                bot.sendMessage({
                    to: channelID,
                    message: `${results.trim()}`
                });

                Logger.debug('Results returned to channel ' + channelID);
            }
        });         
    }).catch((reject) => {
        bot.sendMessage({
            to: channelID,
            message: 'I\'m too tired to get the results right now'
        });

        Logger.error(`Error obtaining results: ${reject}`);
    });
};

async function getStandings(channelID, playoffsOnly) {
    await Axios.get(StandingsUrl).then((resolve) => {
        let divisionsArray = [];
        let counter = 0;
        let standings = '';
        const $ = Cheerio.load(resolve.data);

        if (playoffsOnly) {
            divisionsArray = $('#content').find('.teams').text().split(WhitespaceRegex);
        } else {
            divisionsArray = $('#content').find('.divisions').text().split(WhitespaceRegex);
        }
        
        divisionsArray.forEach((element, index) => {
            if (index == 0) {
                standings = `${element}`;
            } else if (element.includes('Wet') || element.includes('Dry') || element.includes('Sleepy')) {
                if (playoffsOnly) {
                    divisionsArray.length = index + 1;

                    bot.sendMessage({
                        to: channelID,
                        message: `${standings.trim()}`
                    });
    
                    Logger.debug('Playoff standings returned to channel ' + channelID);
                } else {
                    standings += `\n\n**${element}:**`;
                }
            } else if (element.includes('-')) {
                standings += `  ${element}`;
                if (playoffsOnly) {
                    // Playoff results are always in pairs, so put a line after every 2 scores
                    // Crude, but it works
                    counter ++
                    if (counter % 2 == 0) {
                        standings += '\n'
                    }
                }
            } else if (element != '') {
                standings += `\n> ${TeamEmoji.get(element)} ${element}`;
            } else {
                // Final element of the split array is always blank
                bot.sendMessage({
                    to: channelID,
                    message: `${standings.trim()}`
                });

                Logger.debug('Standings returned to channel ' + channelID);
            }
        })                
    }).catch((reject) => {
        bot.sendMessage({
            to: channelID,
            message: 'I\'m too tired to get the standings right now'
        });

        Logger.error(`Error obtaining standings: ${reject}`);
    });
};

async function playoffPicture(channelID) {
    await Axios.get(StandingsUrl).then((resolve) => {
        let teams = [];
        let wins = [];
        let losses = [];
        let remainingGames = null;
        let qualifiedLeadersMap = new Map([]);
        let qualifiedTeamsMap = new Map([]);
        let contentionLeadersMap = new Map([]);
        let contentionTeamsMap = new Map([]);
        let eliminatedTeamsMap = new Map([]);
        let qualifiedTeams = '';
        let contentionTeams = '';
        let eliminatedTeams = '';
        const $ = Cheerio.load(resolve.data);

        // Playoffs in progress, don't work out the playoff picture, get standings instead
        if ($('#content').text().includes('Playoffs')) {
            getStandings(channelID, true);
        } else {
            const divisionsArray = $('#content').find('.divisions').text().split(WhitespaceRegex);
            
            divisionsArray.forEach((element, index) => {
                if (element.includes('Wet') || element.includes('Dry') || element.includes('Sleepy')) {
                    if (teams != []) {
                        divisionLeadersCalculator(teams, wins, losses, qualifiedLeadersMap, contentionLeadersMap, contentionTeamsMap);

                        teams = [];
                        wins = [];
                        losses = [];
                    }          
                } else if (element.includes('-')) {
                    wins.push(`${element.substring(0,element.indexOf('-'))}`);
                    losses.push(`${element.substring(element.indexOf('-') + 1)}`);

                    // Calculate twice and compare due there always being 1 team with 5 bonus wins at start of season
                    if (remainingGames == null) {
                        remainingGames = -(GamesPerSeason - wins[0] - losses[0]);
                    } else if (remainingGames < 0) {
                        if ((0 - remainingGames) > (GamesPerSeason - wins[1] - losses[1])) {
                            remainingGames = GamesPerSeason - wins[1] - losses[1];
                        } else {
                            remainingGames = 0 - remainingGames;
                        }
                    }
                } else if (element != '') {
                    teams.push(`${element}`);
                } else if (index != 0) {
                    // Final element of the split array is always blank
                    // Sort the contenders by their key (wins)
                    contentionLeadersMap = new Map([...contentionLeadersMap.entries()].sort((a, b) => b[0] - a[0])); 
                    contentionTeamsMap = new Map([...contentionTeamsMap.entries()].sort((a, b) => b[0] - a[0]));

                    // These are the important values for working out qualification and elimination
                    const fourthPlaceWins = Math.round(Array.from(contentionTeamsMap.keys())[3]);
                    const fifthPlaceTeam = Array.from(contentionTeamsMap.values())[4];
                    const fifthPlaceMaximumWins = parseInt(fifthPlaceTeam.substring(fifthPlaceTeam.indexOf('|') + 1));
                    
                    qualifiedLeadersCaclulator(contentionLeadersMap, qualifiedLeadersMap, fifthPlaceMaximumWins);
                    bestOfTheRestCalculator(contentionTeamsMap, qualifiedTeamsMap, eliminatedTeamsMap, fourthPlaceWins, fifthPlaceMaximumWins);
                    
                    // Sort each map by their key (wins)
                    qualifiedLeadersMap = new Map([...qualifiedLeadersMap.entries()].sort((a, b) => b[0] - a[0]));
                    qualifiedTeamsMap = new Map([...qualifiedTeamsMap.entries()].sort((a, b) => b[0] - a[0]));
                    eliminatedTeamsMap = new Map([...eliminatedTeamsMap.entries()].sort((a, b) => b[0] - a[0]));

                    qualifiedLeadersMap.forEach((value) => {
                        qualifiedTeams += `> ${value}\n`;
                    });
                    qualifiedTeamsMap.forEach((value) => {
                        qualifiedTeams += `> ${value}\n`;
                    });
                    contentionLeadersMap.forEach((value) => {
                        contentionTeams += `> ${value}\n`;
                    });
                    contentionTeamsMap.forEach((value) => {
                        contentionTeams += `> ${value}\n`;
                    });
                    eliminatedTeamsMap.forEach((value) => {
                        eliminatedTeams += `> ${value}\n`;
                    });

                    bot.sendMessage({
                        to: channelID,
                        message: `The Playoff Picture with ${remainingGames} Games Remaining:`
                                + `${(qualifiedTeams != '') ? '\n\n**Clinched:**\n' : ''}${qualifiedTeams.trim()}`
                                + `${(contentionTeams != '') ? '\n\n**In Contention:**\n' : ''}${contentionTeams.trim()}`
                                + `${(eliminatedTeams != '') ? '\n\n**Party Time <:partypuck:1129421806260981842>:**\n' : ''}${eliminatedTeams.trim()}`
                    });

                    Logger.debug('Playoff picture returned to channel ' + channelID);
                }
            })
        }                
    }).catch((reject) => {
        bot.sendMessage({
            to: channelID,
            message: 'I\'m too tired to get the playoff picture right now'
        });

        Logger.error(`Error obtaining Playoff picture: ${reject}`);
    });
};

// Calculate if the leader of a division has won and made the playoffs
function divisionLeadersCalculator(teams, wins, losses, qualifiedLeadersMap, contentionLeadersMap, contentionTeamsMap) {
    teams.forEach((element, index) => {        
        // Ignore Sleepers, they have no playoff impact
        if (element != 'Sleepers') {
            let winCount = parseInt(wins[index]);

            if (index == 0) {
                // The division leader has won if 2nd can't catch them
                if (winCount > (GamesPerSeason - parseInt(losses[1]))) {
                    while (qualifiedLeadersMap.get(winCount)) {
                        winCount -= .01;
                    }
                    qualifiedLeadersMap.set(winCount,`${TeamEmoji.get(element)} ${element} **${wins[index]}-${losses[index]}** - Division Winner`);
                } else {
                    while (contentionLeadersMap.get(winCount)) {
                        winCount -= .01;
                    }
                    contentionLeadersMap.set(winCount,`${TeamEmoji.get(element)} ${element} **${wins[index]}-${losses[index]}** - Division Leader`);
                }
            } else {
                const maximumWins = GamesPerSeason - parseInt(losses[index]);

                // Count all other teams as being in contention for now
                while (contentionTeamsMap.get(winCount)) {
                    winCount -= .01;
                }
                contentionTeamsMap.set(winCount,`${TeamEmoji.get(element)} ${element} **${wins[index]}-${losses[index]}**|${maximumWins}`);
            }
        }
    });
};

// Calculates which leaders will have qualified, even if they haven't won
function qualifiedLeadersCaclulator(contentionLeadersMap, qualifiedLeadersMap, fifthPlaceMaximumWins) {    
    contentionLeadersMap.forEach((value, key) => {
        // Qualified if they can't be caught by 5th place of the non-leading teams in contention
        if (Math.round(key) > fifthPlaceMaximumWins) {
            contentionLeadersMap.delete(key);
            while (qualifiedLeadersMap.get(key)) {
                key -= .01;
            }
            qualifiedLeadersMap.set(key, value);
        }
    });
}

// Calculate which of the rest of the teams have qualified and which have been eliminated
function bestOfTheRestCalculator(contentionTeamsMap, qualifiedTeamsMap, eliminatedTeamsMap, fourthPlaceWins, fifthPlaceMaximumWins) {    
    let position = 0;
    
    contentionTeamsMap.forEach((value, key) => {        
        position++;
        
        if (position <= 4) {
            // Top 4 qualify as soon as they can't be caught by 5th place
            if (Math.round(key) > fifthPlaceMaximumWins) {
                contentionTeamsMap.delete(key);
                while (qualifiedTeamsMap.get(key)) {
                    key -= .01;
                }
                qualifiedTeamsMap.set(key, `${value.substring(0,value.indexOf('|'))}`);
            } else {
                contentionTeamsMap.set(key, `${value.substring(0,value.indexOf('|'))}`);
            }
        } else {
            const maximumWins = parseInt(value.substring(value.indexOf('|') + 1));

            // Everyone else is eliminated as soon as they can't catch 4th place
            if (maximumWins < fourthPlaceWins) {
                contentionTeamsMap.delete(key);
                while (eliminatedTeamsMap.get(key)) {
                    key -= .01;
                }
                eliminatedTeamsMap.set(key, `${value.substring(0,value.indexOf('|'))}`);                
            } else {
                contentionTeamsMap.set(key, `${value.substring(0,value.indexOf('|'))}`);
            }
        }
    });
}

function findTeam(channelID, teamName) {
    const teamChannel = isTeamChannel(channelID);

    if (teamName == '' && teamChannel[0] == true) {
        teamName = teamChannel[1].toLowerCase();
    }

    if (teamName == "") {    
        bot.sendMessage({
            to: channelID,
            message: 'You need to give me a team name'
        });
    } else if (teamName == "sleepers") {
        bot.sendMessage({
            to: channelID,
            message: 'Who are they?'
        });
    } else {
        let i = 0;
        let teamFound = false;

        TeamEmoji.forEach((value, key) => {
            if (!teamFound && key != "Sleepers") {
                if (key.toLowerCase().includes(teamName)) {
                    teamFound = true;
                    getTeam(channelID, i, key, teamChannel[0]);
                }
                i++
            }
        })

        if (!teamFound) {
            bot.sendMessage({
                to: channelID,
                message: `I don't know which team ${teamName} refers to`
            });    
        }
    }    
}

function isTeamChannel(channelID) {
    // You really should be able to do this a better way, but I can't work it out.
    // bot.channels.get(channelID) doesn't work, says it isn't a valid function despite all the doumentation saying it is.
    // Everything on Stack Overflow suggests this is because the bot doesn't have permissions to see the channels,
    // but then why does bot.channels return an object with all the channels in it?
    // Can't work out how to do anything with the returned object, you can print out the contents fine with console.log
    // and it looks very much like a JSON, but nothing you'd usually be able to do with a JSON works.
    // Except for stringify, tried it on a whim and that works for some reason.
    // Just parse it as text for now, maybe some nice person will look at this comment on GitHub and say, "You silly donkey,
    // it's so easy, you just do this", and that will make me very happy.
    let teamName = '';
    const channels = JSON.stringify(bot.channels);
    const thisChannel = channels.substring(channels.indexOf(channelID));
    const parentChannelIndex = thisChannel.indexOf('"parent_id":') + 13;
    
    if (parentChannelIndex > 13) {
        const parentChannelID = thisChannel.substring(parentChannelIndex,parentChannelIndex + 19);
        const parentChannel = channels.substring(channels.indexOf(parentChannelID));        
        const parentChannelNameStart = parentChannel.substring(parentChannel.indexOf('\"name":"') + 8);
        const parentChannelName = parentChannelNameStart.substring(0,parentChannelNameStart.indexOf('"'));
        
        TeamEmoji.forEach((value,key) => {
            if (teamName == '' && parentChannelName.match(key)) {
                teamName = key;
            }
        })
    }

    // Certain team emojis cause the channel names to not return properly from bot.channels
    // Only happens on the live system in AWS, not when I run locally to test
    // Backstop with hard-coded channel IDs while I try and work out what's going on
    if (teamName == '') {
        teamName = TeamChannel.get(channelID);
    }

    if (teamName > '') {
        return [true, teamName];
    } else {
        return [false, ''];
    }
}

async function getTeam(channelID, i, team, teamChannel) {
    await Axios.get(`${StandingsUrl}/${i.toString()}`).then((resolve) => {
        const $ = Cheerio.load(resolve.data);
        let playerList = `${TeamEmoji.get(team)} **${team}**\n\n`;
        let player = '';
        let offence = 0.0;
        let defence = 0.0;
        let agility = 0.0;
        let electionStats = [];
        
        const playerArray = $('#content').find('.player').text().split(WhitespaceRegex).slice(1,-1);
        const rosterPlayers = [...playerArray].slice(0,48);
        const shadowPlayers = [...playerArray].slice(48);

        rosterPlayers.forEach((element, index) => {            
            if ((index % 8) == 0){                
                playerList += `> ${element} - ${rosterPlayers[index + 1]}\n`;

                if (teamChannel) {
                    player = `${rosterPlayers[index + 1]}, ${element}`;
                }
            } else if ((index % 8) == 2) {                
                playerList += `> ${element} - **${rosterPlayers[index + 1]}**, ${rosterPlayers[index + 2]} - **${rosterPlayers[index + 3]}**, ${rosterPlayers[index + 4]} - `;

                if (teamChannel) {
                    offence = parseFloat(rosterPlayers[index + 1]);
                    defence = parseFloat(rosterPlayers[index + 3]);
                }
            } else if ((index % 8) == 7) {                
                playerList += `**${element}**\n\n`;
                
                if (teamChannel) {
                    agility = parseFloat(element);
                    electionStats = calculateElectionStats(player, offence, defence, agility, electionStats);
                }
            }
        });

        playerList += '**Shadows:**\n\n'

        shadowPlayers.forEach((element, index) => {
            if ((index % 7) == 0){                
                playerList += `> ${element}\n`;

                if (teamChannel) {
                    player = `${element}, Shadows`;
                }
            } else if ((index % 7) == 1) {
                playerList += `> ${element} - **${shadowPlayers[index + 1]}**, ${shadowPlayers[index + 2]} - **${shadowPlayers[index + 3]}**, ${shadowPlayers[index + 4]} - `;

                if (teamChannel) {
                    offence = parseFloat(shadowPlayers[index + 1]);
                    defence = parseFloat(shadowPlayers[index + 3]);
                }
            } else if ((index % 7) == 6) {
                playerList += `**${element}**\n\n`;

                if (teamChannel) {
                    agility = parseFloat(element);
                    electionStats = calculateElectionStats(player, offence, defence, agility, electionStats);
                }
            }
        })

        if (teamChannel) {
            playerList += `> Best Player: ${electionStats[0][0]} - **${electionStats[0][1].toFixed(2)}**\n> Worst Player: ${electionStats[1][0]} - **${electionStats[1][1].toFixed(2)}**\n> Worst Stat: ${electionStats[2][0]}, ${electionStats[2][1]} - **${electionStats[2][2].toFixed(2)}**\n> Best Offence: ${electionStats[3][0]} - **${electionStats[3][1].toFixed(2)}**\n> Best Defence: ${electionStats[4][0]} - **${electionStats[4][1].toFixed(2)}**`;
        }

        bot.sendMessage({
            to: channelID,
            message: `${playerList.trim()}`
        });
    }).catch((reject) => {
        bot.sendMessage({
            to: channelID,
            message: 'I\'m too tired to get that team right now'
        });

        Logger.error(`Error obtaining team: ${reject}`);
    });
};

// Caculate stats which may be useful when deciding how to vote in elections
function calculateElectionStats(player, offence, defence, agility, electionStats) {
    const totalStats = offence + defence + agility;
    let bestPlayer = [];
    let worstPlayer = [];
    let worstStat = [];
    let bestOffence = [];
    let bestDefence = [];
    
    // First player encountered, make them best and worst of everything
    if (electionStats.length == 0) {
        bestPlayer = [player, totalStats];
        worstPlayer = [player, totalStats];
        worstStat = [player, 'Offence', offence];
        bestOffence = [player, offence];
        bestDefence = [player, defence];
        electionStats[2] = worstStat;
    } else {
        if (totalStats > electionStats[0][1]) {
            bestPlayer = [player, totalStats];
        } else if (totalStats < electionStats[1][1]) {
            worstPlayer = [player, totalStats];
        }

        if (offence > electionStats[3][1]) {
            bestOffence = [player, offence];
        }
        if (defence > electionStats[4][1]) {
            bestDefence = [player, defence];
        }
    }

    if (offence < electionStats[2][2]) {
        worstStat = [player, 'Offence', offence];
    }
    if (defence < electionStats[2][2]) {
        worstStat = [player, 'Defence', defence];
    }
    if (agility < electionStats[2][2]) {
        worstStat = [player, 'Agility', agility];
    }

    return [(bestPlayer.length == 0) ? electionStats[0] : bestPlayer,
            (worstPlayer.length == 0) ? electionStats[1] : worstPlayer,
            (worstStat.length == 0) ? electionStats[2] : worstStat,
            (bestOffence.length == 0) ? electionStats[3] : bestOffence,
            (bestDefence.length == 0) ? electionStats[4] : bestDefence]
}

// Admin function to populate rosters in the DB
async function populateRosters () {
    const rostersCollection = Database.collection('rosters');

    for (let i = 0; i < 21; i++) {
        let playerArray = [];
        let rosterPlayers = [];
        let shadowPlayers = [];

        await Axios.get(`${StandingsUrl}/${i.toString()}`).then((resolve) => {
            const $ = Cheerio.load(resolve.data);
                        
            playerArray = $('#content').find('.player').text().split(WhitespaceRegex).slice(1,-1);
            rosterPlayers = [...playerArray].slice(0,48);
            shadowPlayers = [...playerArray].slice(48);
        }).catch((reject) => {                
            Logger.error(`Error obtaining team ${i}: ${reject}`);
        });

        rosterPlayers.forEach(async (element, index) => {
            if ((index % 8) == 0) {
                const findPlayer = { team: Teams[i], name: rosterPlayers[index + 1] };
                const player = await rostersCollection.findOne(findPlayer);

                if (!player) {
                    await rostersCollection.insertOne({ team: Teams[i], name: rosterPlayers[index + 1], position: element });
                }
            }
        });

        shadowPlayers.forEach(async (element, index) => {
             if ((index % 7) == 0) {                
                const findPlayer = { team: Teams[i], name: element };
                const player = await rostersCollection.findOne(findPlayer);

                if (!player) {
                     await rostersCollection.insertOne({ team: Teams[i], name: element, position: 'Shadows' });
                }                           
            }
        });
    }
}

// Admin function to manually load a log.txt file
async function loadStats(parameters) {
    const gameLog = Fs.readFileSync('./log.txt').toString().split(/\n/g);
    const parametersArray = parameters.split(' ');
    let teamsArray = [];
    let weatherReportArray = [];
    await parseGameLog(gameLog, parametersArray[0], (parametersArray[1] == 'true'), teamsArray, weatherReportArray);
}

// Once per hour once all games are finished, parse the game logs to gather stats
async function statsGatherer () {
    const miscCollection = Database.collection('misc');
    const statsCollection = Database.collection('stats');
    const now = new Date(Date.now());
    let lastStatsHour = -1
    let games = null;
    let $games = null;
    let gamesInProgress = false;
    let offseason = false;
    let playoffStats = false;

    try {
        const lastStatsHourRecord = await miscCollection.findOne({ name: 'lastStatsHour' });
        
        if (lastStatsHourRecord) {
            lastStatsHour = lastStatsHourRecord.hour;
        } else {
            await miscCollection.insertOne({ name: 'lastStatsHour',  hour: now.getHours() });
        }

        isOffSeason(async (result) => {
            if (result) {
                await miscCollection.updateOne({ name: 'lastStatsHour' }, { $set: { hour: now.getHours() } });
                offseason = true;
            }
        });

        // Games start on the hour and always last at least 15 mins, so don't do anything before then
        if (!offseason && now.getHours() != lastStatsHour && now.getMinutes() > 15) {
            await Axios.get(GamesUrl).then((resolve) => {        
                $games = Cheerio.load(resolve.data);
                games = $games('#content').find('.game');
        
                games.each((index, element) => {                    
                    if ($(element).text().indexOf('game in progress') > 0) {
                        gamesInProgress = true;
                    }
                });                
            }).catch((reject) => {        
                Logger.error(`Error obtaining game status': ${reject}`);
            });
            
            if (!gamesInProgress) {
                const currentSeason = await miscCollection.findOne({ name: 'currentSeason' });
                const seasonNumber = currentSeason.season;                
                let weatherReport = '';
                let weatherReportArray = [];

                await Axios.get(StandingsUrl).then((resolve) => {
                    const $ = Cheerio.load(resolve.data);
                
                    // Playoffs in progress
                    if ($('#content').text().includes('Playoffs')) {
                        playoffStats = true;
                    }
                });

                const findWalCarine = { name: 'Wal Carine', season: seasonNumber, playoffs: playoffStats };
                let walCarineStats = await statsCollection.findOne(findWalCarine);
                let walCarineFights = 0;

                if (walCarineStats) {
                    walCarineFights = walCarineStats.fights;
                }
                
                games.each(async (index, element) => {
                    await Axios.get(`${GamesUrl}/${index.toString()}`).then(async (resolve) => {
                        const $ = Cheerio.load(resolve.data);
                        const gameLog = $('#messages').text().replace(/[\.!]/g,' ').split(WhitespaceRegex);

                        const resultRaw = $games(element).find('.scoreboard').text();
                        const resultArray = resultRaw.trim().replaceAll('\n','').replace(WhitespaceRegex,'|').split('|');
                        const teamsArray = [`${resultArray[0]}`,`${resultArray[2]}`];

                        parseGameLog(gameLog, seasonNumber, playoffStats, teamsArray, weatherReportArray).then(async () => {
                            if (games.length == (index + 1) && weatherReportArray.length > 0) {
                                weatherReport = `Greetings splorts fans! With all games concluded it\'s time for the Hlockey Weather Report, brought to you by ${Sponsors[Math.floor(Math.random()*Sponsors.length)]}\n`;

                                weatherReportArray.forEach(async (element, index) => {
                                    weatherReport += `\n${element}`;

                                    if (weatherReportArray.length == (index + 1)) {
                                        walCarineStats = await statsCollection.findOne(findWalCarine); 
                                        let walCarineGamesWithoutAFightRecord = await miscCollection.findOne({ name: 'walCarineGamesWithoutAFight' });
                                        let walCarineGamesWithoutAFight = 0;

                                        if (!walCarineGamesWithoutAFightRecord) {
                                            await miscCollection.insertOne({ name: 'walCarineGamesWithoutAFight',  games: 0 });
                                            walCarineGamesWithoutAFightRecord = await miscCollection.findOne({ name: 'walCarineGamesWithoutAFight' });
                                        }
                                        
                                        if (!walCarineStats || walCarineStats.fights == walCarineFights) {
                                            walCarineGamesWithoutAFight = walCarineGamesWithoutAFightRecord.fights + 1;
                                        }

                                        await miscCollection.updateOne({ name: 'walCarineGamesWithoutAFight' }, { $set: { games: walCarineGamesWithoutAFight } });

                                        if (walCarineGamesWithoutAFight > 0) {
                                            weatherReport += `\nIt has been ${walCarineGamesWithoutAFight} games since Wal Carine has had a fight`;
                                        }

                                        bot.sendMessage({
                                            to: WatchChannel,
                                            message: `${weatherReport.trim()}`
                                        });
                                    }
                                });
                            }
                        });
                    });
                });                
                
                await miscCollection.updateOne({ name: 'lastStatsHour' }, { $set: { hour: now.getHours() } });
            }
        }
    } catch (error) {
        Logger.error(`Error processing stats: ${error}`);
    }
}

function parseGameLog(gameLog, seasonNumber, playoffStats, teamsArray, weatherReportArray) {
    return new Promise((resolve) => {
        const rostersCollection = Database.collection('rosters');
        const statsCollection = Database.collection('stats');
        const interval = 100;
        let lineCount = 0;
        let overtime = false;
        let playersArray = [];
        let gameWeatherArray = ['',''];
        let temporaryCenters = ['',''];
        let temporaryGoalies = ['',''];
        
        gameLog.forEach((element, index) => {
            // Process each line at 100ms intervals to give the DB time to do its thing
            setTimeout(async () => {
                // When coming from a log file many lines end in either . or !
                // Remove this, it can mess things up
                element = element.replace(/[\.!]/g,'');
                const elementArray = element.split(' ');
                
                if (teamsArray.length == 0 && index == 0) {
                    // First line is always team names when loading from a log file
                    teamsArray = element.split(' vs ');
                } else if (element.toLowerCase().includes('period')) {
                    if (parseInt(elementArray[elementArray.length - 1]) > 3) {
                        overtime = true;
                    }
                } else if (element.toLowerCase().includes('faceoff')) {
                    updateFaceoffStats(elementArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, temporaryCenters);
                } else if (element.toLowerCase().includes('passes')) {
                    let interceptionArray = [];

                    // Interceptions will be on the next line
                    if (gameLog[index + 1].toLowerCase().includes('intercepted')) {
                        const interceptionLine = gameLog[index + 1].replace(/[\.!]/g,'');
                        interceptionArray = interceptionLine.split(' ');
                    }

                    updatePassingStats(elementArray, interceptionArray, rostersCollection, statsCollection, playersArray, seasonNumber, playoffStats);
                } else if (element.toLowerCase().includes('hits')) {
                    updateHitStats(elementArray, rostersCollection, statsCollection, playersArray, seasonNumber, playoffStats);
                } else if (element.toLowerCase().includes('takes a shot')) {
                    let blockedArray = [];

                    // Blocked shots will be on the next line
                    if (gameLog[index + 1].toLowerCase().includes('blocks')) {
                        const blockedLine = gameLog[index + 1].replace(/[\.!]/g,'');
                        blockedArray = blockedLine.split(' ');
                    }

                    updateShootingStats(elementArray, blockedArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, temporaryGoalies);
                } else if (element.toLowerCase().includes('fighting')) {
                    let fightArray = [element];
                    let i = 1;

                    // Get the whole fight
                    do {
                        fightArray.push(gameLog[index + i].replace(/[\.!]/g,''));
                        i++
                    } while (gameLog[index + i].toLowerCase().includes('punch') || gameLog[index + i].toLowerCase().includes('fight'))

                    // After the fight is over we get morale changes for each team
                    fightArray.push(gameLog[index + i + 1].replace(/[\.!]/g,''));
                    fightArray.push(gameLog[index + i + 2].replace(/[\.!]/g,''));

                    updateFightingStats(fightArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats);
                } else if (element.toLowerCase().includes('washed away') || element.toLowerCase().includes('chickened')) {
                    const swappedLine = gameLog[index + 1].replace(/[\.!]/g,'');
                    const swappedLineArray = swappedLine.split(' ');
                    
                    updateGameRosterChanges(elementArray, swappedLineArray, rostersCollection, statsCollection, teamsArray, playersArray, gameWeatherArray, temporaryCenters, temporaryGoalies, seasonNumber, playoffStats);
                } else if (element.toLowerCase().includes('game over')) {
                    const victoryLine = gameLog[index + 1];

                    updatePlayedStats(victoryLine, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, overtime);
                }

                lineCount++

                if (lineCount == gameLog.length) {
                    if (gameWeatherArray.length == 0) {
                        return resolve();
                    }
                    gameWeatherArray.forEach((element, index) => {
                        if (element != '') {
                            weatherReportArray.push(element);
                        }

                        if (gameWeatherArray.length == (index + 1)) {
                            return resolve();
                        }
                    });                   
                }
            }, index * interval);
        });
    });
}

async function updateFaceoffStats (gameLogLineArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, temporaryCenters) {
    const winningPlayer = `${gameLogLineArray[0]} ${gameLogLineArray[1]}`;
    const winningPlayerRoster = await rostersCollection.findOne({ name: winningPlayer });
    const findWinningPlayer = { name: winningPlayer, season: seasonNumber, playoffs: playoffStats };
    let winningPlayerStats = await statsCollection.findOne(findWinningPlayer);
    
    if (!winningPlayerStats) {
        await createPlayerStats(winningPlayerRoster, statsCollection, seasonNumber, playoffStats);
        winningPlayerStats = await statsCollection.findOne(findWinningPlayer);
    }

    await statsCollection.updateOne(findWinningPlayer, { $set: { faceoffsTaken : winningPlayerStats.faceoffsTaken + 1,
                                                                 faceoffsWon: winningPlayerStats.faceoffsWon + 1 }});

    if (!playersArray.includes(winningPlayer)) {
        playersArray.push(winningPlayer);
    }

    const winningTeamIndex = teamsArray.indexOf(winningPlayerRoster.team);
    let losingTeam = '';
    let temporaryCenter = '';
    let losingPlayerRoster = null;

    if (winningTeamIndex == 0) {
        losingTeam = teamsArray[1];
        temporaryCenter = temporaryCenters[1];
    } else {
        losingTeam = teamsArray[0];
        temporaryCenter = temporaryCenters[0];
    }

    if (temporaryCenter == '') {
        losingPlayerRoster = await rostersCollection.findOne({ team: losingTeam, position: 'Center' });
    } else {
        losingPlayerRoster = await rostersCollection.findOne({ name: temporaryCenter });
    }

    const findLosingPlayer = { name: losingPlayerRoster.name, season: seasonNumber, playoffs: playoffStats };
    let losingPlayerStats = await statsCollection.findOne(findLosingPlayer);

    if (!losingPlayerStats) {
        await createPlayerStats(losingPlayerRoster, statsCollection, seasonNumber, playoffStats);
        losingPlayerStats = await statsCollection.findOne(findLosingPlayer);
    }    

    await statsCollection.updateOne(findLosingPlayer, { $set: { faceoffsTaken : losingPlayerStats.faceoffsTaken + 1 }});
    
    if (!playersArray.includes(losingPlayerRoster.name)) {
        playersArray.push(losingPlayerRoster.name);
    }

    teamsArray.forEach(async (element) => {
        const findTeam = { name: element, season: seasonNumber, playoffs: playoffStats };
        let teamStats = await statsCollection.findOne(findTeam);

        if (!teamStats) {
            await createTeamStats(element, statsCollection, seasonNumber, playoffStats);
            teamStats = await statsCollection.findOne(findTeam);
        }

        if (element == losingTeam) {
            await statsCollection.updateOne(findTeam, { $set: { faceoffsTaken: teamStats.faceoffsTaken + 1 } });
        } else {
            await statsCollection.updateOne(findTeam, { $set: { faceoffsTaken: teamStats.faceoffsTaken + 1,
                                                                faceoffsWon: teamStats.faceoffsWon + 1 } });
        }
    });  
}

async function updatePassingStats(gameLogLineArray, interceptionArray, rostersCollection, statsCollection, playersArray, seasonNumber, playoffStats) {
    const passingPlayer = `${gameLogLineArray[0]} ${gameLogLineArray[1]}`;
    const passingPlayerRoster = await rostersCollection.findOne({ name: passingPlayer });
    const findPassingPlayer = { name: passingPlayer, season: seasonNumber, playoffs: playoffStats };
    const findPassingTeam = { name: passingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
    const passingTeamStats = await statsCollection.findOne(findPassingTeam);
    let passingPlayerStats = await statsCollection.findOne(findPassingPlayer);
    
    if (!passingPlayerStats) {
        await createPlayerStats(passingPlayerRoster, statsCollection, seasonNumber, playoffStats);
        passingPlayerStats = await statsCollection.findOne(findPassingPlayer);
    }    

    if (interceptionArray.length == 0) {
        await statsCollection.updateOne(findPassingPlayer, { $set: { passesAttempted: passingPlayerStats.passesAttempted + 1,
                                                                     passesCompleted: passingPlayerStats.passesCompleted + 1 } });
        await statsCollection.updateOne(findPassingTeam, { $set: { passesAttempted: passingTeamStats.passesAttempted + 1,
                                                                   passesCompleted: passingTeamStats.passesCompleted + 1 } });        
    } else {
        const inteceptingPlayer = `${interceptionArray[interceptionArray.length - 2]} ${interceptionArray[interceptionArray.length - 1]}`;
        const interceptingPlayerRoster = await rostersCollection.findOne({ name: inteceptingPlayer });
        const findInterceptingPlayer = { name: inteceptingPlayer, season: seasonNumber, playoffs: playoffStats };
        const findInterceptingTeam = { name: interceptingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
        const interceptingTeamStats = await statsCollection.findOne(findInterceptingTeam);
        let interceptingPlayerStats = await statsCollection.findOne(findInterceptingPlayer);
        
        if (!interceptingPlayerStats) {
            await createPlayerStats(interceptingPlayerRoster, statsCollection, seasonNumber, playoffStats);
            interceptingPlayerStats = await statsCollection.findOne(findInterceptingPlayer);
        }        

        await statsCollection.updateOne(findPassingPlayer, { $set: { passesAttempted: passingPlayerStats.passesAttempted + 1 } });
        await statsCollection.updateOne(findPassingTeam, { $set: { passesAttempted: passingTeamStats.passesAttempted + 1} });
        await statsCollection.updateOne(findInterceptingPlayer, { $set: { interceptions: interceptingPlayerStats.interceptions + 1} });
        await statsCollection.updateOne(findInterceptingTeam, { $set: { interceptions: interceptingTeamStats.interceptions + 1} });

        if (!playersArray.includes(inteceptingPlayer)) {
            playersArray.push(inteceptingPlayer);
        }
    }

    if (!playersArray.includes(passingPlayer)) {
        playersArray.push(passingPlayer);
    }
}

async function updateHitStats(gameLogLineArray, rostersCollection, statsCollection, playersArray, seasonNumber, playoffStats) {
    const hittingPlayer = `${gameLogLineArray[0]} ${gameLogLineArray[1]}`;
    const hittingPlayerRoster = await rostersCollection.findOne({ name: hittingPlayer });
    const findHittingPlayer = { name: hittingPlayer, season: seasonNumber, playoffs: playoffStats };
    const findHittingTeam = { name: hittingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
    const hittingTeamStats = await statsCollection.findOne(findHittingTeam);
    let hittingPlayerStats = await statsCollection.findOne(findHittingPlayer);
    
    if (!hittingPlayerStats) {
        await createPlayerStats(hittingPlayerRoster, statsCollection, seasonNumber, playoffStats);
        hittingPlayerStats = await statsCollection.findOne(findHittingPlayer);
    }
    
    const hitPlayer = `${gameLogLineArray[3]} ${gameLogLineArray[4]}`;
    const hitPlayerRoster = await rostersCollection.findOne({ name: hitPlayer });
    const findHitPlayer = { name: hitPlayer, season: seasonNumber, playoffs: playoffStats };
    const findHitTeam = { name: hitPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
    const hitTeamStats = await statsCollection.findOne(findHitTeam);
    let hitPlayerStats = await statsCollection.findOne(findHitPlayer);
    
    if (!hitPlayerStats) {
        await createPlayerStats(hitPlayerRoster, statsCollection, seasonNumber, playoffStats);
        hitPlayerStats = await statsCollection.findOne(findHitPlayer);
    }

    if (gameLogLineArray[gameLogLineArray.length - 1].toLowerCase() == 'puck') {
        await statsCollection.updateOne(findHittingPlayer, { $set: { hits: hittingPlayerStats.hits + 1,
                                                                     takeaways: hittingPlayerStats.takeaways + 1 } });
        await statsCollection.updateOne(findHittingTeam, { $set: { hits: hittingTeamStats.hits + 1,
                                                                   takeaways: hittingTeamStats.takeaways + 1 } });
        await statsCollection.updateOne(findHitPlayer, { $set: { hitsTaken: hitPlayerStats.hitsTaken + 1,
                                                                 pucksLost: hitPlayerStats.pucksLost + 1 } });
        await statsCollection.updateOne(findHitTeam, { $set: { hitsTaken: hitTeamStats.hitsTaken + 1,
                                                               pucksLost: hitTeamStats.pucksLost + 1 } });
    } else {
        await statsCollection.updateOne(findHittingPlayer, { $set: { hits: hittingPlayerStats.hits + 1 } });
        await statsCollection.updateOne(findHittingTeam, { $set: { hits: hittingTeamStats.hits + 1 } });
        await statsCollection.updateOne(findHitPlayer, { $set: { hitsTaken: hitPlayerStats.hitsTaken + 1 } });
        await statsCollection.updateOne(findHitTeam, { $set: { hitsTaken: hitTeamStats.hitsTaken + 1 } });
    }

    if (!playersArray.includes(hittingPlayer)) {
        playersArray.push(hittingPlayer);
    }
    if (!playersArray.includes(hitPlayer)) {
        playersArray.push(hitPlayer);
    }
}

async function updateShootingStats(gameLogLineArray, blockedArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, temporaryGoalies) {
    const shootingPlayer = `${gameLogLineArray[0]} ${gameLogLineArray[1]}`;
    const shootingPlayerRoster = await rostersCollection.findOne({ name: shootingPlayer });
    const findShootingPlayer = { name: shootingPlayer, season: seasonNumber, playoffs: playoffStats };
    const findShootingTeam = { name: shootingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
    const shootingTeamStats = await statsCollection.findOne(findShootingTeam);
    let shootingPlayerStats = await statsCollection.findOne(findShootingPlayer);
    
    if (!shootingPlayerStats) {
        await createPlayerStats(shootingPlayerRoster, statsCollection, seasonNumber, playoffStats);
        shootingPlayerStats = await statsCollection.findOne(findShootingPlayer);
    }

    if (gameLogLineArray[gameLogLineArray.length - 1].toLowerCase() == 'scores') {
        const scoringTeamIndex = teamsArray.indexOf(shootingPlayerRoster.team);
        let concedingTeam = '';
        let temporaryGoalie = '';
        let concedingPlayerRoster = null;

        if (scoringTeamIndex == 0) {
            concedingTeam = teamsArray[1];
            temporaryGoalie = temporaryGoalies[1];
        } else {
            concedingTeam = teamsArray[0];
            temporaryGoalie = temporaryGoalies[0];
        }

        if (temporaryGoalie == '') {
            concedingPlayerRoster = await rostersCollection.findOne({ team: concedingTeam, position: 'Goalie' });            
        } else {
            concedingPlayerRoster = await rostersCollection.findOne({ name: temporaryGoalie });
        }
        
        const findConcedingPlayer = { name: concedingPlayerRoster.name, season: seasonNumber, playoffs: playoffStats };
        const findConcedingTeam = { name: concedingTeam, season: seasonNumber, playoffs: playoffStats };
        const concedingTeamStats = await statsCollection.findOne(findConcedingTeam);
        let concedingPlayerStats = await statsCollection.findOne(findConcedingPlayer);

        if (!concedingPlayerStats) {
            await createPlayerStats(concedingPlayerRoster, statsCollection, seasonNumber, playoffStats);
            concedingPlayerStats = await statsCollection.findOne(findConcedingPlayer);
        }

        await statsCollection.updateOne(findShootingPlayer, { $set: { goalsScored: shootingPlayerStats.goalsScored + 1,
                                                                      shotsTaken: shootingPlayerStats.shotsTaken + 1 } });
        await statsCollection.updateOne(findShootingTeam, { $set: { goalsScored: shootingTeamStats.goalsScored + 1,
                                                                    shotsTaken: shootingTeamStats.shotsTaken + 1 } });
        await statsCollection.updateOne(findConcedingPlayer, { $set: { goalsConceded: concedingPlayerStats.goalsConceded + 1,
                                                                       shotsFaced: concedingPlayerStats.shotsFaced + 1 } });
        await statsCollection.updateOne(findConcedingTeam, { $set: { goalsConceded: concedingTeamStats.goalsConceded + 1,
                                                                     shotsFaced: concedingTeamStats.shotsFaced + 1 } });

        if (!playersArray.includes(concedingPlayerRoster.name)) {
            playersArray.push(concedingPlayerRoster.name);
        }
    } else {
        const blockingPlayer = `${blockedArray[0]} ${blockedArray[1]}`;
        const blockingPlayerRoster = await rostersCollection.findOne({ name: blockingPlayer });
        const findBlockingPlayer = { name: blockingPlayer, season: seasonNumber, playoffs: playoffStats };
        const findBlockingTeam = { name: blockingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
        const blockingTeamStats = await statsCollection.findOne(findBlockingTeam);
        let blockingPlayerStats = await statsCollection.findOne(findBlockingPlayer);

        if (!blockingPlayerStats) {
            await createPlayerStats(blockingPlayerRoster, statsCollection, seasonNumber, playoffStats);
            blockingPlayerStats = await statsCollection.findOne(findBlockingPlayer);
        }

        if (!playersArray.includes(blockingPlayer)) {
            playersArray.push(blockingPlayer);
        }

        let blockingStatsUpdate = '';

        if (blockingPlayerRoster.position == 'Goalie') {
            blockingStatsUpdate = { shotsFaced: blockingPlayerStats.shotsFaced + 1,
                                    shotsBlockedGoalie: blockingPlayerStats.shotsBlockedGoalie + 1 };
        } else {
            blockingStatsUpdate = { shotsBlockedDefence: blockingPlayerStats.shotsBlockedDefence + 1 };
        }

        await statsCollection.updateOne(findShootingPlayer, { $set: { shotsTaken: shootingPlayerStats.shotsTaken + 1 } });
        await statsCollection.updateOne(findShootingTeam, { $set: { shotsTaken: shootingTeamStats.shotsTaken + 1 } });
        await statsCollection.updateOne(findBlockingPlayer, { $set: blockingStatsUpdate });
        await statsCollection.updateOne(findBlockingTeam, { $set: { shotsFaced: blockingTeamStats.shotsFaced + 1,
                                                                    shotsBlocked: blockingTeamStats.shotsBlocked + 1 } });
    }

    if (!playersArray.includes(shootingPlayer)) {
        playersArray.push(shootingPlayer);
    }
}

async function updateFightingStats(fightArray, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats) {
    const interval = 50;
    let fightingPlayers = [];

    // Process a line every 50ms to let the DB do DB things
    fightArray.forEach(async (element, index) => {
        setTimeout(async () => {
            const fightLineArray = element.split(' ');

            if (element.toLowerCase().includes('fighting')) {
                const fightingPlayer1 = `${fightLineArray[0]} ${fightLineArray[1]}`;
                const fightingPlayer2 = `${fightLineArray[3]} ${fightLineArray[4]}`;

                fightingPlayers.push(fightingPlayer1);
                fightingPlayers.push(fightingPlayer2);

                if (!playersArray.includes(fightingPlayer1)) {
                    playersArray.push(fightingPlayer1);
                }
                if (!playersArray.includes(fightingPlayer2)) {
                    playersArray.push(fightingPlayer2);
                }

                const fightingPlayer1Roster = await rostersCollection.findOne({ name: fightingPlayer1 });
                const fightingPlayer2Roster = await rostersCollection.findOne({ name: fightingPlayer2 });
                const findfightingPlayer1 = { name: fightingPlayer1, season: seasonNumber, playoffs: playoffStats };
                const findfightingPlayer2 = { name: fightingPlayer2, season: seasonNumber, playoffs: playoffStats };
                let fightingPlayer1Stats = await statsCollection.findOne(findfightingPlayer1);
                let fightingPlayer2Stats = await statsCollection.findOne(findfightingPlayer2);
                
                if (!fightingPlayer1Stats) {
                    await createPlayerStats(fightingPlayer1Roster, statsCollection, seasonNumber, playoffStats);
                }
                if (!fightingPlayer2Stats) {
                    await createPlayerStats(fightingPlayer2Roster, statsCollection, seasonNumber, playoffStats);
                }
            } else if (element.toLowerCase().includes('joins')) {
                const fightingPlayer = `${fightLineArray[0]} ${fightLineArray[1]}`;

                fightingPlayers.push(fightingPlayer);

                if (!playersArray.includes(fightingPlayer)) {
                    playersArray.push(fightingPlayer);
                }

                const fightingPlayerRoster = await rostersCollection.findOne({ name: fightingPlayer });
                const findfightingPlayer = { name: fightingPlayer, season: seasonNumber, playoffs: playoffStats };
                let fightingPlayerStats = await statsCollection.findOne(findfightingPlayer);
                
                if (!fightingPlayerStats) {
                    await createPlayerStats(fightingPlayerRoster, statsCollection, seasonNumber, playoffStats);
                    fightingPlayerStats = await statsCollection.findOne(findfightingPlayer);
                }
            } else if (element.toLowerCase().includes('punches')) {
                const blocked = fightArray[index + 1].toLowerCase().includes('blocks');

                const punchingPlayer = `${fightLineArray[0]} ${fightLineArray[1]}`;
                const punchedPlayer = `${fightLineArray[3]} ${fightLineArray[4]}`;
                const punchingPlayerRoster = await rostersCollection.findOne({ name: punchingPlayer });
                const punchedPlayerRoster = await rostersCollection.findOne({ name: punchedPlayer });
                const findPunchingPlayer = { name: punchingPlayer, season: seasonNumber, playoffs: playoffStats };
                const findPunchedPlayer = { name: punchedPlayer, season: seasonNumber, playoffs: playoffStats };
                const findPunchingTeam = { name: punchingPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
                const findPunchedTeam = { name: punchedPlayerRoster.team, season: seasonNumber, playoffs: playoffStats };
                const punchingPlayerStats = await statsCollection.findOne(findPunchingPlayer);
                const punchedPlayerStats = await statsCollection.findOne(findPunchedPlayer);
                const punchingTeamStats = await statsCollection.findOne(findPunchingTeam);
                const punchedTeamStats = await statsCollection.findOne(findPunchedTeam);

                if (blocked) {
                    await statsCollection.updateOne(findPunchingPlayer, { $set: { punchesThrown: punchingPlayerStats.punchesThrown + 1 } });
                    await statsCollection.updateOne(findPunchingTeam, { $set: { punchesThrown: punchingTeamStats.punchesThrown + 1 } });
                    await statsCollection.updateOne(findPunchedPlayer, { $set: { punchesTaken: punchedPlayerStats.punchesTaken + 1,
                                                                                 punchesBlocked: punchedPlayerStats.punchesBlocked + 1 } });
                    await statsCollection.updateOne(findPunchedTeam, { $set: { punchesTaken: punchedTeamStats.punchesTaken + 1,
                                                                               punchesBlocked: punchedTeamStats.punchesBlocked + 1 } });
                } else {
                    await statsCollection.updateOne(findPunchingPlayer, { $set: { punchesThrown: punchingPlayerStats.punchesThrown + 1,
                                                                                  punchesLanded: punchingPlayerStats.punchesLanded + 1 } });
                    await statsCollection.updateOne(findPunchingTeam, { $set: { punchesThrown: punchingTeamStats.punchesThrown + 1,
                                                                                punchesLanded: punchingTeamStats.punchesLanded + 1 } });
                    await statsCollection.updateOne(findPunchedPlayer, { $set: { punchesTaken: punchedPlayerStats.punchesTaken + 1 } });
                    await statsCollection.updateOne(findPunchedTeam, { $set: { punchesTaken: punchedTeamStats.punchesTaken + 1 } });    
                }
            } else if (element.toLowerCase().includes('ended')) {
                if (fightArray[index + 1].toLowerCase().includes('morale')) {
                    let teamName = ''
                    let winningTeam = '';
                    let i = 0;

                    do {
                        teamName += `${fightLineArray[i]} `;
                        i++
                    } while (i < (fightArray[index + 1].toLowerCase().indexOf('morale') - 2));
                    
                    teamName.trim();
                    
                    if (fightArray[index + 1].toLowerCase().includes('gains')) {
                        winningTeam = teamName;                        
                    } else {
                        const teamIndex = teamsArray.indexOf(teamName);

                        if (teamIndex == 0) {
                            winningTeam = teamsArray[1];
                        } else {
                            winningTeam = teamsArray[0];        
                        }
                    }

                    fightingPlayers.forEach(async (element) => {
                        const playerRoster = await rostersCollection.findOne({ name: element });
                        const findPlayer = { name: element, season: seasonNumber, playoffs: playoffStats };
                        const playerStats = await statsCollection.findOne(findPlayer);

                        if (playerRoster.team == winningTeam) {
                            await statsCollection.updateOne(findPlayer, { $set: { fights: playerStats.fights + 1,
                                                                                  fightsWon: playerStats.fightsWon + 1 } });
                        } else {
                            await statsCollection.updateOne(findPlayer, { $set: { fights: playerStats.fights + 1 } });
                        }
                    })

                    teamsArray.forEach(async (element) => {
                        const findTeam = { name: element, season: seasonNumber, playoffs: playoffStats }; 
                        const teamStats = await statsCollection.findOne(findTeam);

                        if (element == winningTeam) {
                            await statsCollection.updateOne(findTeam, { $set: { fights: teamStats.fights + 1,
                                                                                  fightsWon: teamStats.fightsWon + 1 } }); 
                        } else {
                            await statsCollection.updateOne(findTeam, { $set: { fights: teamStats.fights + 1 } });
                        }
                    });
                }
            }
        }, index * interval);
    });
}

async function updateGameRosterChanges(gameLogLineArray, swappedPlayerLineArray, rostersCollection, statsCollection, teamsArray, playersArray, gameWeatherArray, temporaryCenters, temporaryGoalies, seasonNumber, playoffStats) {
    const leavingPlayer = `${gameLogLineArray[0]} ${gameLogLineArray[1]}`;
    const arrivingPlayer = `${swappedPlayerLineArray[0]} ${swappedPlayerLineArray[1]}`;
    const leavingPlayerRoster = await rostersCollection.findOne({ name: leavingPlayer });
    const arrivingPlayerRoster = await rostersCollection.findOne({ name: arrivingPlayer });
    const findLeavingPlayer = { name: leavingPlayer, season: seasonNumber, playoffs: playoffStats };
    const findArrivingPlayer = { name: arrivingPlayer, season: seasonNumber, playoffs: playoffStats };
    let leavingPlayerStats = await statsCollection.findOne(findLeavingPlayer);
    const arrivingPlayerStats = await statsCollection.findOne(findArrivingPlayer);
    
    if (!leavingPlayerStats) {
        await createPlayerStats(leavingPlayerRoster, statsCollection, seasonNumber, playoffStats);
        leavingPlayerStats = await statsCollection.findOne(findLeavingPlayer);
    }
    if (!arrivingPlayerStats) {
        // Don't need to use arrivingPlayerStats, just need to make sure it's present
        await createPlayerStats(arrivingPlayerRoster, statsCollection, seasonNumber, playoffStats);
    }

    if (!playersArray.includes(leavingPlayer)) {
        playersArray.push(leavingPlayer);
    }
    if (!playersArray.includes(arrivingPlayer)) {
        playersArray.push(arrivingPlayer);
    }

    const waves = gameLogLineArray[gameLogLineArray.length - 1] == 'waves'
    const teamIndex = teamsArray.indexOf(leavingPlayerRoster.team);

    if (waves) {
        await statsCollection.updateOne(findLeavingPlayer, { $set: { timesSweptAway: leavingPlayerStats.timesSweptAway + 1 } });
        await rostersCollection.updateOne({ name: arrivingPlayer }, { $set: { position: leavingPlayerRoster.position } });
        await rostersCollection.updateOne({ name: leavingPlayer }, { $set: { position: 'Shadows' } });        
    } else {
        await statsCollection.updateOne(findLeavingPlayer, { $set: { timesChickenedOut: leavingPlayerStats.timesChickenedOut + 1 } });
        

        if (leavingPlayerRoster.position == 'Goalie') {
            temporaryGoalies[teamIndex] = arrivingPlayer;
        } else if (leavingPlayerRoster.position == 'Center') {
            temporaryCenters[teamIndex] = arrivingPlayer;
        }
    }

    if (gameWeatherArray[teamIndex] == '') {
        gameWeatherArray[teamIndex] = `${TeamEmoji.get(leavingPlayerRoster.team)}**${leavingPlayerRoster.team}**\n:white_sun_rain_cloud:**${waves ? 'Waves' : 'Chicken'}**\n\n`
    }
    
    gameWeatherArray[teamIndex] += `> ${leavingPlayer} ${waves ? 'was swept away from' : 'ran away from'} ${leavingPlayerRoster.position} into the Shadows\n`
    gameWeatherArray[teamIndex] += `> ${arrivingPlayer} emerged from the Shadows to take ${leavingPlayerRoster.position}\n`
}

async function updatePlayedStats(victoryLine, rostersCollection, statsCollection, teamsArray, playersArray, seasonNumber, playoffStats, overtime) {
    // 2 separate replace operations as lines from the log file will have !, and lines from the website won't
    const winningTeam = victoryLine.replace(' win','').replace('!','');

    teamsArray.forEach(async (element) => {
        const findTeam = { name: element, season: seasonNumber, playoffs: playoffStats };
        const teamStats = await statsCollection.findOne(findTeam);

        if (element == winningTeam) {
            if (overtime) {
                await statsCollection.updateOne(findTeam, { $set: { gamesPlayed: teamStats.gamesPlayed + 1,
                                                                    gamesWon: teamStats.gamesWon + 1,
                                                                    overtimeGamesPlayed: teamStats.overtimeGamesPlayed + 1,
                                                                    overtimeGamesWon: teamStats.overtimeGamesWon + 1 } });
            } else {
                await statsCollection.updateOne(findTeam, { $set: { gamesPlayed: teamStats.gamesPlayed + 1,
                                                                    gamesWon: teamStats.gamesWon + 1 } });                                                                    
            }
        } else {
            if (overtime) {
                await statsCollection.updateOne(findTeam, { $set: { gamesPlayed: teamStats.gamesPlayed + 1,
                                                                    overtimeGamesPlayed: teamStats.overtimeGamesPlayed + 1 } });
            } else {
                await statsCollection.updateOne(findTeam, { $set: { gamesPlayed: teamStats.gamesPlayed + 1 } });
            }
        }
    });

    playersArray.forEach(async (element) => {
        const playerRoster = await rostersCollection.findOne({ name: element });
        const findPlayer = { name: element, season: seasonNumber, playoffs: playoffStats };
        const playerStats = await statsCollection.findOne(findPlayer);
        
        if (playerRoster.team == winningTeam) {
            if (overtime) {
                await statsCollection.updateOne(findPlayer, { $set: { gamesPlayed: playerStats.gamesPlayed + 1,
                                                                      gamesWon: playerStats.gamesWon + 1,
                                                                      overtimeGamesPlayed: playerStats.overtimeGamesPlayed + 1,
                                                                      overtimeGamesWon: playerStats.overtimeGamesWon + 1 } });
            } else {
                await statsCollection.updateOne(findPlayer, { $set: { gamesPlayed: playerStats.gamesPlayed + 1,
                                                                      gamesWon: playerStats.gamesWon + 1 } });                                                                    
            }
        } else {
            if (overtime) {
                await statsCollection.updateOne(findPlayer, { $set: { gamesPlayed: playerStats.gamesPlayed + 1,
                                                                      overtimeGamesPlayed: playerStats.overtimeGamesPlayed + 1 } });
            } else {
                await statsCollection.updateOne(findPlayer, { $set: { gamesPlayed: playerStats.gamesPlayed + 1 } });
            }
        }
    });    
}

async function createPlayerStats(player, statsCollection, seasonNumber, playoffStats) {
    await statsCollection.insertOne({ name: player.name,
                                      team: player.team,
                                      season: seasonNumber,
                                      playoffs: playoffStats,
                                      gamesPlayed: 0,
                                      gamesWon: 0,
                                      overtimeGames: 0,
                                      overtimeGamesWon: 0,
                                      faceoffsTaken: 0,
                                      faceoffsWon: 0,
                                      passesAttempted: 0,
                                      passesCompleted: 0,
                                      interceptions: 0,
                                      hits: 0,
                                      takeaways: 0,
                                      hitsTaken: 0,
                                      pucksLost: 0,
                                      goalsScored: 0,
                                      goalsConceded: 0,
                                      shotsTaken: 0,
                                      shotsFaced: 0,
                                      shotsBlockedGoalie: 0,
                                      shotsBlockedDefence: 0,
                                      fights: 0,
                                      fightsWon: 0,
                                      punchesThrown: 0,
                                      punchesLanded: 0,
                                      punchesTaken: 0,
                                      punchesBlocked: 0,
                                      timesSweptAway: 0,
                                      timesChickenedOut: 0 });
}

async function createTeamStats(team, statsCollection, seasonNumber, playoffStats) {
    await statsCollection.insertOne({ name: team,
                                      season: seasonNumber,
                                      playoffs: playoffStats,
                                      gamesPlayed: 0,
                                      gamesWon: 0,
                                      overtimeGames: 0,
                                      overtimeGamesWon: 0,
                                      faceoffsTaken: 0,
                                      faceoffsWon: 0,
                                      passesAttempted: 0,
                                      passesCompleted: 0,
                                      interceptions: 0,
                                      hits: 0,
                                      takeaways: 0,
                                      hitsTaken: 0,
                                      pucksLost: 0,
                                      goalsScored: 0,
                                      goalsConceded: 0,
                                      shotsTaken: 0,
                                      shotsFaced: 0,
                                      shotsBlocked: 0,
                                      fights: 0,
                                      fightsWon: 0,
                                      punchesThrown: 0,
                                      punchesLanded: 0,
                                      punchesTaken: 0,
                                      punchesBlocked: 0 });
}