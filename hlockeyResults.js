//Global Variables
const Discord = require('discord.io');
const GatewayIntentBits = require('discord.io');
const Partials = require('discord.io');
const Logger = require('winston');
const Fs = require("fs");
const Auth = require('./auth.json');
const Axios = require('axios');
const Cheerio = require('cheerio');

const GamesUrl = 'https://hlockey.onrender.com/league/games';
const StandingsUrl = 'https://hlockey.onrender.com/league/standings';
const GamesPerSeason = 114;
const SleepyGifs = Fs.readFileSync("./sleepyGifs.txt").toString().split(',');

const teamEmoji = new Map([]);

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
    Logger.info('Connected');
    Logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Bot listens for messages that start with `!`
    if (message.substring(0, 1) == '!') {
        Logger.debug('Command ' + message + ' from ' + userID + ' in channel ' + channelID);

        switch (message.toLowerCase()) {
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
        }
    }
});

function setEmoji() {
    teamEmoji.set('Baden Hallucinations', ':mushroom:');
    teamEmoji.set('Lagos Soup', ':bowl_with_spoon:');
    teamEmoji.set('Pica Acid', ':test_tube:');
    teamEmoji.set('Antalya Pirates', ':ocean:');
    teamEmoji.set('Kópavogur Seals', ':seal:');
    teamEmoji.set('Erlangen Ohms', ':aquarius:');
    teamEmoji.set('Wyrzysk Rockets', ':rocket:');
    teamEmoji.set('Pompei Eruptions', ':volcano:');
    teamEmoji.set('Dawson City Impostors', ':knife:');
    teamEmoji.set('Rio de Janeiro Directors', ':cinema:');
    teamEmoji.set('Orcadas Base Fog', ':foggy:');
    teamEmoji.set('Nice Backflippers', ':arrows_counterclockwise:');
    teamEmoji.set('Manbij Fish', ':tropical_fish:');
    teamEmoji.set('Nagqu Paint', ':art:');
    teamEmoji.set('Cape Town Transplants', ':seedling:');
    teamEmoji.set('Kyoto Payphones', ':vibration_mode:');
    teamEmoji.set('Stony Brook Reapers', ':skull:');
    teamEmoji.set('Jakarta Architects', ':triangular_ruler:');
    teamEmoji.set('Baghdad Abacuses', ':abacus:');
    teamEmoji.set('Sydney Thinkers', ':thinking:');
    teamEmoji.set('Sleepers', ':sleeping_accommodation:');
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
        const whitespaceRegex = /\s\s+/g;

        const $ = Cheerio.load(resolve.data);
        const games = $('#content').find('.game');
        const totalGames = games.length;        

        games.each((index, element) => {            
            const resultRaw = $(element).find('.scoreboard').text();
            const afterResults = $(element).text().substring($(element).text().indexOf('Weather:'));
            const weather = afterResults.substring(9,afterResults.indexOf('\n'));
            const afterWeather = afterResults.substring(afterResults.indexOf('\n') + 1);
            const status = afterWeather.substring(0,afterWeather.indexOf('\n')).trim();

            const resultArray = resultRaw.trim().replaceAll('\n','').replace(whitespaceRegex,'|').split('|');
            const result = `${teamEmoji.get(resultArray[0])} ${resultArray[0]}  **${resultArray[1]} - ${resultArray[3]}**  ${resultArray[2]} ${teamEmoji.get(resultArray[2])}`

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
        const whitespaceRegex = /\s\s+/g;

        if (playoffsOnly) {
            divisionsArray = $('#content').find('.teams').text().split(whitespaceRegex);
        } else {
            divisionsArray = $('#content').find('.divisions').text().split(whitespaceRegex);
        }
        
        divisionsArray.forEach((element, index) => {
            if (index == 0) {
                standings = `${element}`;
            } else if (element.includes('Wet') || element.includes('Dry')) {
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
                standings += `\n> ${teamEmoji.get(element)} ${element}`;
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
        let divisionResults = [];
        let qualifiedLeadersMap = new Map([]);
        let qualifiedTeamsMap = new Map([]);
        let contentionLeadersMap = new Map([]);
        let contentionTeamsMap = new Map([]);
        let eliminatedTeamsMap = new Map([]);
        let qualifiedTeams = '';
        let contentionTeams = '';
        let eliminatedTeams = '';
        const $ = Cheerio.load(resolve.data);
        const whitespaceRegex = /\s\s+/g;

        // Playoffs in progress, don't work out the playoff picture, get standings instead
        if ($('#content').text().includes('Playoffs')) {
            getStandings(channelID, true);    
        } else {
            const divisionsArray = $('#content').find('.divisions').text().split(whitespaceRegex);
            
            divisionsArray.forEach((element, index) => {
                if (element.includes('Playoffs')) {
                    getStandings(channelID, true);
                    divisionsArray.length = index + 1;    
                }
                if (element.includes('Wet') || element.includes('Dry') || element.includes('Sleepy')) {
                    if (teams != []) {
                        divisionResults = divisionLeadersCalculator(teams, wins, losses);

                        for (let i = 0; i < 3; i++) {
                            divisionResults[i].forEach((value, key) => {                            
                                if (i == 0) {
                                    while (qualifiedLeadersMap.get(key)) {
                                        key -= .01;
                                    }
                                    qualifiedLeadersMap.set(key, `${value}`);
                                } else if (i == 1) {
                                    while (contentionLeadersMap.get(key)) {
                                        key -= .01;
                                    }
                                    contentionLeadersMap.set(key, `${value}`);
                                } else {
                                    while (contentionTeamsMap.get(key)) {
                                        key -= .01;
                                    }
                                    contentionTeamsMap.set(key, `${value}`);
                                }
                            });
                        }

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
                    divisionResults = divisionLeadersCalculator(teams, wins, losses);
                    
                    for (let i = 0; i < 3; i++) {
                        divisionResults[i].forEach((value, key) => {                            
                            if (i == 0) {
                                while (qualifiedLeadersMap.get(key)) {
                                    key -= .01;
                                }
                                qualifiedLeadersMap.set(key, `${value}`);
                            } else if (i == 1) {
                                while (contentionLeadersMap.get(key)) {
                                    key -= .01;
                                }
                                contentionLeadersMap.set(key, `${value}`);
                            } else {
                                while (contentionTeamsMap.get(key)) {
                                    key -= .01;
                                }
                                contentionTeamsMap.set(key, `${value}`);
                            }
                        });
                    }

                    // Sort the contenders by their key (wins)
                    contentionLeadersMap = new Map([...contentionLeadersMap.entries()].sort((a, b) => b[0] - a[0])); 
                    contentionTeamsMap = new Map([...contentionTeamsMap.entries()].sort((a, b) => b[0] - a[0]));

                    // These are the important values for working out qualification and elimination
                    const fourthPlaceWins = Math.round(Array.from(contentionTeamsMap.keys())[3]);
                    const fifthPlaceWins = Math.round(Array.from(contentionTeamsMap.keys())[4]);
                    const fifthPlaceTeam = Array.from(contentionTeamsMap.values())[4];
                    const fifthPlaceGamesRemaining = parseInt(fifthPlaceTeam.substring(fifthPlaceTeam.indexOf('-') + 1));
                    
                    qualifiedLeadersCaclulator(contentionLeadersMap, contentionTeamsMap, qualifiedLeadersMap, fifthPlaceWins, fifthPlaceGamesRemaining);
                    bestOfTheRestCalculator(contentionTeamsMap, qualifiedTeamsMap, eliminatedTeamsMap, fourthPlaceWins, fifthPlaceWins, fifthPlaceGamesRemaining);
                    
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
function divisionLeadersCalculator(teams, wins, losses) {    
    const qualifiedLeaders = new Map([]);
    const contentionLeaders = new Map([]);
    const contentionTeams = new Map([]);

    teams.forEach((element, index) => {
        let winCount = parseInt(wins[index]);
        const gamesRemaining = GamesPerSeason - (winCount + parseInt(losses[index]));
        
        // Ignore Sleepers, they have no playoff impact
        if (element != 'Sleepers') {
            if (index == 0) {
                // The division leader has won if 2nd can't catch them          
                if (winCount > (gamesRemaining + parseInt(wins[1]))) {
                    qualifiedLeaders.set(winCount,`${teamEmoji.get(element)} ${element} - Division Winner`);
                } else {
                    contentionLeaders.set(winCount,`${teamEmoji.get(element)} ${element} - Division Leader`);
                }
            } else {
                // Count all other teams as being in contention for now
                while (contentionTeams.get(winCount)) {
                    winCount -= .01;
                }
                contentionTeams.set(winCount,`${teamEmoji.get(element)} ${element}-${gamesRemaining}`);
            }
        }
    });

    return [qualifiedLeaders, contentionLeaders, contentionTeams];
};

// Calculates which leaders will have qualified, even if they haven't won
function qualifiedLeadersCaclulator(contentionLeadersMap, contentionTeamsMap, qualifiedLeadersMap, fifthPlaceWins, fifthPlaceGamesRemaining) {    
    contentionLeadersMap.forEach((value, key) => {
        // Qualified if they can't be caught by 5th place of the non-leading teams in contention
        if (Math.round(key) > (fifthPlaceWins + fifthPlaceGamesRemaining)) {
            contentionLeadersMap.delete(key);
            while (qualifiedLeadersMap.get(key)) {
                key -= .01;
            }
            qualifiedLeadersMap.set(key, value);
        } else {
            contentionLeadersMap.set(key, value);
        }
    });
}

// Calculate which of the rest of the teams have qualified and which have been eliminated
function bestOfTheRestCalculator(contentionTeamsMap, qualifiedTeamsMap, eliminatedTeamsMap, fourthPlaceWins, fifthPlaceWins, fifthPlaceGamesRemaining) {    
    let position = 0;
    
    contentionTeamsMap.forEach((value, key) => {        
        position++;
        
        if (position <= 4) {
            // Top 4 qualify as soon as they can't be caught by 5th place
            if (Math.round(key) > (fifthPlaceWins + fifthPlaceGamesRemaining)) {
                contentionTeamsMap.delete(key);
                while (qualifiedTeamsMap.get(key)) {
                    key -= .01;
                }
                qualifiedTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);
            } else {
                contentionTeamsMap.set(key, `${value.substring(0,value.indexOf('-'))}`);
            }
        } else {
            const gamesRemaining = parseInt(value.substring(value.indexOf('-') + 1));

            // Everyone else is eliminated as soon as they can't catch 4th place
            if ((Math.round(key) + gamesRemaining) < fourthPlaceWins) {
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