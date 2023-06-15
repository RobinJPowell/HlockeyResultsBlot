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