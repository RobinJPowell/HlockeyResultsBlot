//Global Variables
const Discord = require('discord.io');
const GatewayIntentBits = require('discord.io');
const Partials = require('discord.io');
const Logger = require('winston');
const Auth = require('./auth.json');
const Axios = require('axios');
const Cheerio = require('cheerio');

const GamesUrl = 'https://hlockey.onrender.com/league/games';
const StandingsUrl = 'https://hlockey.onrender.com/league/standings';
const GamesPerSeason = 114;

const teamEmoji = new Map([]);

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
    setEmoji();
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

            results += result.replaceAll('\n','').replace(whitespaceRegex,'  ').trim() + '\n:white_sun_rain_cloud: ' + weather + '     ' + status + '\n\n';
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
                standings += `\n\n**${element}:**`;
            } else if (element.includes('-')) {
                standings += `  ${element}`;
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
        let qualifiedTeamsMap = new Map([]);
        let contentionTeamsMap = new Map([]);
        let eliminatedTeamsMap = new Map([]);
        let qualifiedTeams = '';
        let contentionTeams = '';
        let eliminatedTeams = '';
        const $ = Cheerio.load(resolve.data);
        const whitespaceRegex = /\s\s+/g;

        const divisionsArray = $('#content').find('.divisions').text().split(whitespaceRegex);
        
        divisionsArray.forEach((element, index) => {
            if (element.includes('Wet') || element.includes('Dry')) {
                if (teams != []) {
                    divisionResults = playoffCalculator(teams, wins, losses); 
                    qualifiedTeamsMap = new Map([...qualifiedTeamsMap,...divisionResults[0]]);
                    contentionTeamsMap = new Map([...contentionTeamsMap,...divisionResults[1]]);
                    eliminatedTeamsMap = new Map([...eliminatedTeamsMap,...divisionResults[2]]);               
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
                qualifiedTeamsMap = new Map([...qualifiedTeamsMap,...divisionResults[0]]);
                contentionTeamsMap = new Map([...contentionTeamsMap,...divisionResults[1]]);
                eliminatedTeamsMap = new Map([...eliminatedTeamsMap,...divisionResults[2]]);

                // Sort each map by their key (wins)
                qualifiedTeamsMap = new Map([...qualifiedTeamsMap.entries()].sort((a, b) => b[0] - a[0]));
                contentionTeamsMap = new Map([...contentionTeamsMap.entries()].sort((a, b) => b[0] - a[0]));
                eliminatedTeamsMap = new Map([...eliminatedTeamsMap.entries()].sort((a, b) => b[0] - a[0]));

                qualifiedTeamsMap.forEach((value) => {
                    qualifiedTeams += `> ${value}\n`;
                });
                contentionTeamsMap.forEach((value) => {
                    contentionTeams += `> ${value}\n`;
                });
                eliminatedTeamsMap.forEach((value, key) => {
                    eliminatedTeams += `> ${value}\n`;
                });

                bot.sendMessage({
                    to: channelID,
                    message: `The Playoff Picture:`
                            + `${(qualifiedTeams != '') ? '\n\n**Clinched:**\n\n' : ''}${qualifiedTeams.trim()}`
                            + `${(contentionTeams != '') ? '\n\n**In Contention:**\n\n' : ''}${contentionTeams.trim()}`
                            + `${(eliminatedTeams != '') ? '\n\n**Eliminated:**\n\n' : ''}${eliminatedTeams.trim()}`
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
    const qualifiedTeams = new Map([]);
    const contentionTeams = new Map([]);
    const eliminatedTeams = new Map([]);

    teams.forEach((element, index) => {
        if (index <= 1) {
            // 1st and 2nd places are qualified if 3rd can't catch them
            if (parseInt(wins[index]) > (gamesRemaining + parseInt(wins[2]))) {
                qualifiedTeams.set(parseInt(wins[index]),`${teamEmoji.get(element)} ${element}`);
            } else {
                contentionTeams.set(parseInt(wins[index]),`${teamEmoji.get(element)} ${element}`);
            }
        } else {
            // All others are eliminated if they can't catch 2nd
            if (parseInt(wins[1]) > (gamesRemaining + parseInt(wins[index]))) {
                eliminatedTeams.set(parseInt(wins[index]),`${teamEmoji.get(element)} ${element}`);
            } else {
                contentionTeams.set(parseInt(wins[index]),`${teamEmoji.get(element)} ${element}`);
            }
        }
    });

    return [qualifiedTeams, contentionTeams, eliminatedTeams];
};