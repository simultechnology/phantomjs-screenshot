var http = require("http");
var phantom = require('phantom');
var gm = require('gm').subClass({ imageMagick: true });
var fs = require('fs');
var util = require("util");
var mime = require("mime");
var url = require('url');

var targetPath = 'original',
    captureName = 'original.png',
    thumbnailName = 'thumbnail.png',
    thumbnailSize = {
      width: 225,
      height: 126
    };

http.createServer(function(req, res) {
  if (req.method === 'GET' && req.url.indexOf('/original') === 0) {
    outputHtml(res, 'sample.html');
  } else if (req.method === 'GET' && req.url.indexOf('/resize') === 0) {
    var targetUrl = arrangeUrlForPhantomJS(req);
    createThumbnail(targetUrl, res);
  } else {
    outputHtml(res, 'input.html');
  }
}).listen(8888);

function outputHtml(res, localFileName) {
  fs.readFile(__dirname + '/public_html/' + localFileName, 'utf-8', function (err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write("not found!");
      return res.end();
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
}

function arrangeUrlForPhantomJS(req) {
  var referer = req.headers.referer;
  if (referer.lastIndexOf('/') !== referer.length - 1) {
    referer += '/'
  }
  var thumbUrl = referer + targetPath;

  var urlParts = url.parse(req.url, true);
  var inputUrl = urlParts.query.url;
  if (inputUrl) {
    // 入力されたURLにプロトコルが存在しない場合、補完する
    if (inputUrl.indexOf('http') !== 0) {
      inputUrl = 'http://' + inputUrl;
    }
    thumbUrl = inputUrl;
  }
  return thumbUrl;
}

function createThumbnail(targetUrl, res) {

  phantom.create(function (ph) {
    ph.createPage(function (page) {
      var ratio = 10;
      page.set('viewportSize', {
        width: thumbnailSize.width * ratio, height: thumbnailSize.height * ratio
      });
      page.open(targetUrl,
        function (status) {
          page.render(captureName, function () {
            var thumbRatio = 2;
            gm(captureName)
              .quality(100)
              .unsharp(2, [1.4, 0.5, 0])
              //.thumbnail(thumbnailSize.width, thumbnailSize.height)
              .resize(thumbnailSize.width * thumbRatio, thumbnailSize.height * thumbRatio)
              .write(thumbnailName, function (err) {
                if (err) {
                  return console.dir(arguments);
                }
                var img = fs.readFileSync(thumbnailName).toString("base64");
                var url = util.format("data:%s;base64,%s", mime.lookup(thumbnailName), img);

                res.writeHead(200, {"Content-Type": "text/plain"});
                res.write(url);
                res.end();
              });
          });
        });
    });
  });
}
