var Botkit = require('botkit')
var Harvest = require('harvest');
var config = require('nconf');

config.argv().env().file({file: 'config/default.json'});
var harvest = new Harvest({
    subdomain: config.get('harvest:subdomain'),
    email: config.get('harvest:email'),
    password: config.get('harvest:password')
});

// Expect a SLACK_TOKEN environment variable
var slackToken = process.env.SLACK_TOKEN
if (!slackToken) {
  console.error('SLACK_TOKEN is required!')
  process.exit(1)
}

var controller = Botkit.slackbot()
var bot = controller.spawn({
  token: slackToken
})

bot.startRTM(function (err, bot, payload) {
  if (err) {
    throw new Error('Could not connect to Slack')
  }
})

controller.hears(['help'], ['direct_message', 'direct_mention'], function(bot, message) {
    bot.reply(message, "Send me a direct message or mention with the word 'projects' in it :simple_smile:");
});

controller.hears(['projects'], ['direct_message', 'direct_mention'], function(bot, message) {
    
    harvest.Projects.list({}, function(err, projects) {
        var requests = 0;
        var responseMessage = "";
        if (err) {
            console.log("Error");
            console.log(err);
            responseMessage = "There was an error retrieving projects from Harvest";
        } else {
            var projectNames = {};
            var numProjects = projects.length;
            for (var i=0; i < numProjects; i++) {
                var project = projects[i]["project"];
                if (project) {
                    requests++;
                    projectNames[project.client_id] = project.name;
                    harvest.Clients.get({id: project.client_id}, function(err, clients) {
                        requests--;
                        if (err) {
                            console.log("Error");
                            console.log(err);
                        } else {
                            var client = clients["client"];
                            responseMessage += client.name + ": " + projectNames[client.id] + "\n";
                        }
                    });
                }
            }
            
            var responseInterval = setInterval(function() {
                if (requests == 0) {
                    clearInterval(responseInterval);
                    bot.startPrivateConversation({user: message.user}, function(err, dm) {
                        dm.say(responseMessage);
                    });
                }
            }, 100);
        }
    });
});
