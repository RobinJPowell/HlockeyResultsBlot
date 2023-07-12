//Global Variables
const Discord = require('discord.io');
const GatewayIntentBits = require('discord.io');
const Partials = require('discord.io');
const Logger = require('winston');
const Fs = require("fs");
const Auth = require('./auth.json');
const Axios = require('axios');
const Cheerio = require('cheerio');
const { off } = require('process');
const { type } = require('os');

const GamesUrl = 'https://hlockey.onrender.com/league/games';
const StandingsUrl = 'https://hlockey.onrender.com/league/standings';
const GamesPerSeason = 114;
const SleepyGifs = Fs.readFileSync("./sleepyGifs.txt").toString().split(',');

const TeamEmoji = new Map([]);
const TeamChannel = new Map([]);
const WhitespaceRegex = /\s\s+/g;

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
                isOffSeason((result) => {
                    if (result) {
                        sleeping(channelID);
                    } else {
                        findTeam(channelID, parameters.toLowerCase());
                    }
                });
                break;
        }
    }
});

function setEmoji() {
    TeamEmoji.set('Antalya Pirates', ':ocean:');
    TeamEmoji.set('Baden Hallucinations', ':mushroom:');
    TeamEmoji.set('Kópavogur Seals', ':seal:');
    TeamEmoji.set('Lagos Soup', ':bowl_with_spoon:');
    TeamEmoji.set('Pica Acid', ':test_tube:');
    TeamEmoji.set('Dawson City Impostors', ':knife:');
    TeamEmoji.set('Erlangen Ohms', ':aquarius:');
    TeamEmoji.set('Pompei Eruptions', ':volcano:');
    TeamEmoji.set('Rio de Janeiro Directors', ':cinema:');
    TeamEmoji.set('Wyrzysk Rockets', ':rocket:');
    TeamEmoji.set('Cape Town Transplants', ':seedling:');
    TeamEmoji.set('Manbij Fish', ':tropical_fish:');
    TeamEmoji.set('Nagqu Paint', ':art:');
    TeamEmoji.set('Nice Backflippers', ':arrows_counterclockwise:');
    TeamEmoji.set('Orcadas Base Fog', ':foggy:');
    TeamEmoji.set('Baghdad Abacuses', ':abacus:');
    TeamEmoji.set('Jakarta Architects', ':triangular_ruler:');
    TeamEmoji.set('Kyoto Payphones', ':vibration_mode:');
    TeamEmoji.set('Stony Brook Reapers', ':skull:');
    TeamEmoji.set('Sydney Thinkers', ':thinking:');
    TeamEmoji.set('Sleepers', ':sleeping_accommodation:');
}

function setTeamChannels() {
    TeamChannel.set('987173855737024522', 'Antalya Pirates');
    TeamChannel.set('987174495687147540', 'Baden Hallucinations');
    TeamChannel.set('987175832902586389', 'Kópavogur Seals');
    TeamChannel.set('987176850927276032', 'Lagos Soup');
    TeamChannel.set('987177076249468988', 'Pica Acid');
    TeamChannel.set('987177378667167765', 'Dawson City Impostors');
    TeamChannel.set('987178525406687262', 'Erlangen Ohms');
    TeamChannel.set('987178627051434038', 'Pompei Eruptions');
    TeamChannel.set('987178803992354846', 'Rio de Janeiro Directors');
    TeamChannel.set('987178965057830972', 'Wyrzysk Rockets');
    TeamChannel.set('987179092992462898', 'Cape Town Transplants');
    TeamChannel.set('987179214677639228', 'Manbij Fish');
    TeamChannel.set('987179372781928469', 'Nagqu Paint');
    TeamChannel.set('987179504659202058', 'Nice Backflippers');
    TeamChannel.set('987179678479552532', 'Orcadas Base Fog');
    TeamChannel.set('987180068008759357', 'Baghdad Abacuses');
    TeamChannel.set('987180244488290354', 'Jakarta Architects');
    TeamChannel.set('987180425254408242', 'Kyoto Payphones');
    TeamChannel.set('987180600073019422', 'Stony Brook Reapers');
    TeamChannel.set('987180723196805200', 'Sydney Thinkers');
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
            const afterWeather = afterResults.substring(afterResults.indexOf('\n') + 1);
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
                    const fifthPlaceMaximumWins = parseInt(fifthPlaceTeam.substring(fifthPlaceTeam.indexOf('-') + 1));
                    
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
                        message: `The Playoff Picture:`
                                + `${(qualifiedTeams != '') ? '\n\n**Clinched:**\n' : ''}${qualifiedTeams.trim()}`
                                + `${(contentionTeams != '') ? '\n\n**In Contention:**\n' : ''}${contentionTeams.trim()}`
                                + `${(eliminatedTeams != '') ? '\n\n**Eliminated:**\n' : ''}${eliminatedTeams.trim()}`
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
                    qualifiedLeadersMap.set(winCount,`${TeamEmoji.get(element)} ${element} - Division Winner`);
                } else {
                    while (contentionLeadersMap.get(winCount)) {
                        winCount -= .01;
                    }
                    contentionLeadersMap.set(winCount,`${TeamEmoji.get(element)} ${element} - Division Leader`);
                }
            } else {
                const maximumWins = GamesPerSeason - parseInt(losses[index]);

                // Count all other teams as being in contention for now
                while (contentionTeamsMap.get(winCount)) {
                    winCount -= .01;
                }
                contentionTeamsMap.set(winCount,`${TeamEmoji.get(element)} ${element}-${maximumWins}`);
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
                qualifiedTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);
            } else {
                contentionTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);
            }
        } else {
            const maximumWins = parseInt(value.substring(value.indexOf('-') + 1));

            // Everyone else is eliminated as soon as they can't catch 4th place
            if (maximumWins < fourthPlaceWins) {
                contentionTeamsMap.delete(key);
                while (eliminatedTeamsMap.get(key)) {
                    key -= .01;
                }
                eliminatedTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);                
            } else {
                contentionTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);
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
        const rosterPlayers = [...playerArray].slice(0,-21);
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
                    player = `Shadows, ${element}`;
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
            playerList += `> Best Player: ${electionStats[0][0]} - **${electionStats[0][1]}**\n> Worst Player: ${electionStats[1][0]} - **${electionStats[1][1]}**\n> Worst Stat: ${electionStats[2][0]}, ${electionStats[2][1]} - **${electionStats[2][2]}**\n> Best Offence: ${electionStats[3][0]} - **${electionStats[3][1]}**\n> Best Defence: ${electionStats[4][0]} - **${electionStats[4][1]}**`;
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

        Logger.error(`Error obtaining standings: ${reject}`);
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