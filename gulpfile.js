var gulp = require('gulp');
var feedparser = require('feedparser');
var request = require('request');
var fs = require('fs');
var querystring = require('querystring');
var url = require('url');
var sanitize = require("sanitize-filename");
var path = require('path');
var htmlencode = require('ent/encode');

function processFeedItem(item) {
  return new Promise(function(resolve, reject) {
    var postId = querystring.parse(url.parse((item['rss:guid']['#'])).query).p;
    console.log(item);
    resolve(postId);

    var destination = path.resolve('./source/_posts/' + postId + '.md');

    var contents = '';

    contents += '---\n';
    contents += 'title: "' + item.title + '"\n';
    contents += 'date: "' + item.date + '"\n';
    contents += '---\n';
    contents += item['rss:description']['#'];

    fs.unlink(destination, function() {
      fs.writeFile(destination, contents, function(error) {

        if(error) {
          reject(error);
          return;
        }

        resolve('Wrote ' + postId + '...');

      })
    });
  });
}

gulp.task('default', function(cb) {

  var promises = [];

  for(var page = 1; page <= 20; page++)
  {
    promises.push(new Promise((resolve, reject) => {
      var req = request('http://www.liberalamerica.org/page/' + page + '/?s=+&feed=rss2');
      var fp = feedparser();

      req.on('error', function (error) {
        // handle any request errors
        reject(error);
      });
      req.on('response', function (res) {
        var stream = this;
        if (res.statusCode != 200) {
          reject(new Error('Bad status code'));
          return;
        }
        stream.pipe(fp);
      });

      fp.on('error', function(error) {
        reject(error);
      });
      fp.on('readable', function() {
        // This is where the action is!
        var stream = this
          , meta = this.meta
          , item;

        var feeds = [];

        while (item = stream.read()) {
          feeds.push(processFeedItem(item));
        }

        Promise.all(feeds).then(function(results) {
          resolve(results);
        }, function(results) {
          reject(results);
        });
      });
    }));

  }

  Promise.all(promises).then(function(results) {
    console.log(results);
  });

});
