process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var config = require('../config');
var async = require('async');
var rest = require('restler');
var qs = require('querystring');
var crypto = require('crypto');
var speakingurl = require('speakingurl');

var home = 'http://localhost:9200';
var base = 'https://slack.com/api/channels.list';
var params = {
  token: config.slack.token
};
var url = base + '?' + qs.stringify(params);

console.log('using URL:', url);


function put (url, data, cb) {
  rest.put(url, {
    headers: {
      'Accept': 'application/json'
    },
    data: data
  }).on('complete', function(result, response) {
    cb(null, result);
  });
}

rest.get(url).on('complete', function(topics) {
  //console.log('topics:', topics.channels);

  topics.channels.filter(function(x) {
    return (x.is_archived === false);
  }).forEach(function(channel) {
    var channelID = speakingurl(channel.name);
    var remote = home + '/topics/' + channelID;

    console.log('topic:', channel);
    console.log('remote:', remote);

    put(remote, {
      id: channelID, // TODO: reject if PUT doesn't match?
      name: channel.name,
      description: channel.purpose.value,
      topic: channel.topic.value,
      created: new Date(channel.created * 1000),
      stats: {
        subscribers: channel.num_members
      }
    }, function(err, result) {
      console.log('channel result:', channel.name, result)//response.statusCode);

      var base = 'https://slack.com/api/channels.history';
      var params = {
        token: config.slack.token,
        channel: channel.id
      };
      var url = base + '?' + qs.stringify(params);

      console.log('channels.history using URL:', url);

      rest.get(url).on('complete', function(data) {
        console.log('retrieved', data.messages.length, 'messages');
        console.log('sample:', data.messages[0]);

        data.messages.filter(function(m) {
          //return (m.reactions && m.reactions.length);
          return (!m.subtype);
        }).forEach(function(message) {
          var state = JSON.stringify(message);
          var key = [channelID, message.user, message.ts].join(':');
          var hash = crypto.createHash('sha256').update(key).digest('hex');
          var remote = home + '/messages/' + hash;

          var timestamp = new Date(message.ts * 1000);
          var reactions = {};

          if (!message.reactions) message.reactions = [];
          message.reactions.forEach(function(r) {
            reactions[r.name] = parseInt(r.count);
          });

          var msg = {
            id: hash,
            topic: channelID,
            author: message.user,
            content: message.text,
            created: timestamp,
            reactions: reactions,
            links: {
              slack: hash // no IDs given by Slack!  uh-oh!
            },
            stats: {}
          };

          if (message.reactions && message.reactions.length) {
            msg.stats.reactions = message.reactions.map(function(x) {
              return x.count;
            }).reduce(function(prev, curr, i) {
              return prev + curr;
            });
          }

          //console.log('msg:', msg);

          put(remote, msg, function(err, result) {
            console.log('message result:', result.id, 'has:', result.created);
          });
        });
      });



      var base = 'https://slack.com/api/emoji.list';
      var params = {
        token: config.slack.token
      };
      var url = base + '?' + qs.stringify(params);
      rest.get(url).on('complete', function(emoji) {
        console.log('emoji:', emoji);
      });


    });
  });
});