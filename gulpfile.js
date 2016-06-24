var gulp = require('gulp');
var feedparser = require('feedparser');
var request = require('request');
var fs = require('fs');
var querystring = require('querystring');
var url = require('url');
var path = require('path');
var cheerio = require('cheerio');

function toTitleCase(str) {
  return str.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
}

function decryptCloudFlareEmail(content) {
  var e, r, n, i, a = content;
  for (e = "", r = parseInt(a.substr(0, 2), 16), n = 8; a.length - n; n += 2) i = parseInt(a.substr(n, 2), 16) ^ r, e += String.fromCharCode(i);
  return e;
}

function scrapePage(url) {
  return new Promise(function(resolve, reject) {
    request({ url, headers: { 'User-Agent': 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36' } }, function(error, response, html){

        if(error) {
          reject(error);
          return;
        }

        var $ = cheerio.load(html);

        var html = '';

        var categories = [];

        $('.current-post-ancestor').each(function(index, element) {
          categories.push($(element).children("a").html());
        });

        $('.post-column .entry').each(function(index, element) {

          var foundStart = false;
          var foundEnd = false;

          // let's go through each child element, and see if we should include it
          $(element).children(function(childIndex, childElement) {

            if($(childElement).hasClass('mashsb-container')) {
              return;
            }

            if($('script[src="//pagead2.googlesyndication.com/pagead/show_ads.js"]', childElement).length) {
              return;
            }

            if($(childElement).hasClass('sharedaddy')) {
              return;
            }

            if($(childElement).hasClass('widget')) {
              return;
            }

            if($(childElement).hasClass('comments-area')) {
              return;
            }

            // decrypt cloudflare encoded emails
            $('.__cf_email__', childElement).each(function(encEmailIndex, encEmailElement) {
              var next = encEmailElement.nextSibling;
              $(next).remove();
              encEmailElement = $(encEmailElement);
              encEmailElement.replaceWith(decryptCloudFlareEmail(encEmailElement.attr('data-cfemail')));
            });

            // make all http iframes becomes protocol-less, to work with https
            $('iframe', childElement).each(function(iFrameIndex, iFrameElement) {
              var src = $(iFrameElement).attr('src');
              $(iFrameElement).attr('src', src.replace(/^(http|https):/, ''));
            });

            var generatedHtml = $.html(childElement);

            // update all wp cdn urls to be protocol-less
            generatedHtml = generatedHtml
            .replace(/(http|https):\/\/i\d.wp.com\/cdn./g, function(match, p1, p2) {
              return match.replace(/(http|https):/g, '');
            });

            html += generatedHtml;

          });
        });

        resolve({
          html,
          categories: categories.filter(function(elem, pos) {
            return categories.indexOf(elem) == pos;
          })
        });
    })
  });
}

function processFeedItem(item) {
  return new Promise(function(resolve, reject) {

    var postId = querystring.parse(url.parse((item['rss:guid']['#'])).query).p;
    var destination = path.resolve('./source/_posts/' + postId + '.md');

    var contents = '';
    contents += '---\n';
    contents += 'title: "' + item.title + '"\n';
    contents += 'date: "' + item.date + '"\n';
    contents += 'tags: \n';

    scrapePage(item.link).then(function(scraped) {
      fs.unlink(destination, function() {
        item.categories.forEach(function(category) {
          scraped.categories.push(category);
        });
        var uniqueCategories = scraped.categories.filter(function(elem, pos) {
          return scraped.categories.indexOf(elem) == pos;
        });
        uniqueCategories.forEach(function(category) {
          contents += ' - ' + toTitleCase(category) + '\n';
        });
        contents += '---\n';
        contents += scraped.html;
        fs.writeFile(destination, contents, function(error) {
          if(error) {
            reject(error);
            return;
          }
          resolve('Wrote ' + postId + '...');
        })
      });
    }, function(result) {
      reject(result);
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
    console.log('Finished!');
  });

});
