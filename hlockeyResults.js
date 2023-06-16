//Global Variables
const Discord = require('discord.io');
const GatewayIntentBits = require('discord.io');
const Partials = require('discord.io');
const Logger = require('winston');
const PackageInfo = require('./package.json');
const Auth = require('./auth.json');
const Axios = require('axios');
const Cheerio = require('cheerio');

const GamesUrl = 'https://hlockey.onrender.com/league/games';
const StandingsUrl = 'https://hlockey.onrender.com/league/standings';
const GamesPerSeason = 114;

// Configure Logger settings
Logger.remove(Logger.transports.Console);
Logger.add(new Logger.transports.Console, {
    colorize: true
});
Logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
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
    Logger.info('Connected');
    Logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Bot listens for messages that start with `!`
    if (message.substring(0, 1).toLowerCase() == '!') {
        Logger.debug('Command ' + message + ' from ' + userID + ' in channel ' + channelID);

        switch (message.toLowerCase()) {
            case '!results':
                getResults(channelID);
                break;
            case '!standings':
                getStandings(channelID);
                break;
            case '!playoffs':
                playoffPicture(channelID);
                break;
        }
    }
});

async function getResults(channelID) {
    await Axios.get(GamesUrl).then((resolve) => {
        let results = '';
        let gamesProcessed = 0;
        const whitespaceRegex = /\s\s+/g;

        const $ = Cheerio.load(resolve.data);
        const games = $('#content').find('.game');
        const totalGames = games.length;        

        games.each((index, element) => {            
            const result = $(element).find('.scoreboard').text();
            const afterResults = $(element).text().substring($(element).text().indexOf('Weather:'));
            const weather = afterResults.substring(0,afterResults.indexOf('\n'));
            const afterWeather = afterResults.substring(afterResults.indexOf('\n') + 1);
            const status = afterWeather.substring(0,afterWeather.indexOf('\n')).trim();

            results += result.replaceAll('\n','').replace(whitespaceRegex,'  ').trim() + '\n' + 'Status: ' + status + '    ' + weather + '\n\n';
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

async function getStandings(channelID) {
    await Axios.get(StandingsUrl).then((resolve) => {
        let standings = '';
        const $ = Cheerio.load(resolve.data);
        const whitespaceRegex = /\s\s+/g;

        const divisionsArray = $('#content').find('.divisions').text().split(whitespaceRegex);
        
        divisionsArray.forEach((element, index) => {
            if (index == 0) {
                standings = `${element}`;
            } else if (element.includes('Wet') || element.includes('Dry')) {
                standings += `\n\n${element}`;
            } else if (element.includes('-')) {
                standings += `  ${element}`;
            } else if (element != '') {
                standings += `\n${element}`;
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
        let qualifiedTeams = '';
        let contentionTeams = '';
        let eliminatedTeams = '';
        let divisionResults = '';
        const $ = Cheerio.load(resolve.data);
        const whitespaceRegex = /\s\s+/g;

        const divisionsArray = $('#content').find('.divisions').text().split(whitespaceRegex);
        
        divisionsArray.forEach((element, index) => {
            if (element.includes('Wet') || element.includes('Dry')) {
                if (teams != []) {
                    divisionResults = playoffCalculator(teams, wins, losses); 
                    qualifiedTeams += divisionResults[0];
                    contentionTeams += divisionResults[1];
                    eliminatedTeams += divisionResults[2];               
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
                divisionResults = playoffCalculator(teams, wins, losses); 
                qualifiedTeams += divisionResults[0];
                contentionTeams += divisionResults[1];
                eliminatedTeams += divisionResults[2];

                bot.sendMessage({
                    to: channelID,
                    message: `The Playoff Picture:`
                            + `${(qualifiedTeams != '') ? '\n\nQualified:\n\n' : ''}${qualifiedTeams.trim()}`
                            + `${(contentionTeams != '') ? '\n\nIn Contention:\n\n' : ''}${contentionTeams.trim()}`
                            + `${(eliminatedTeams != '') ? '\n\nEliminated:\n\n' : ''}${eliminatedTeams.trim()}`
                });

                Logger.debug('Playoff picture returned to channel ' + channelID);
            }
        })                
    }).catch((reject) => {
        bot.sendMessage({
            to: channelID,
            message: 'I\'m too tired to get the playoff picture right now'
        });

        Logger.error(`Error obtaining Playoff picture: ${reject}`);
    });
};

function playoffCalculator(teams, wins, losses) {
    const gamesRemaining = GamesPerSeason - (parseInt(wins[0]) + parseInt(losses[0]));
    let qualifiedTeams = '';
    let contentionTeams = '';
    let eliminatedTeams = '';

    teams.forEach((element, index) => {
        if (index <= 1) {
            // 1st and 2nd places are qualified if 3rd can't catch them
            if (parseInt(wins[index]) > (gamesRemaining + parseInt(wins[2]))) {
                qualifiedTeams += `${element}\n`;
            } else {
                contentionTeams += `${element}\n`;
            }
        } else {
            // All others are eliminated if they can't catch 2nd
            if (parseInt(wins[1]) > (gamesRemaining + parseInt(wins[index]))) {
                eliminatedTeams += `${element}\n`;
            } else {
                contentionTeams += `${element}\n`;
            }
        }
    });

    return [`${qualifiedTeams}`, `${contentionTeams}`, `${eliminatedTeams}`];
};