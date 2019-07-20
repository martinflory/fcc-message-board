'use strict';

var express     = require('express');
var bodyParser  = require('body-parser');
var expect      = require('chai').expect;
var cors        = require('cors');
var MDB               = require('./db');
var helmet            = require('helmet')
var apiRoutes         = require('./routes/api.js');
var fccTestingRoutes  = require('./routes/fcctesting.js');
var runner            = require('./test-runner');
var fixme             = require('fixme');
var app = express();

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Only allow your site to be loading in an iFrame on your own pages.
app.use(helmet.frameguard({ action: 'sameorigin' }));
// Do not allow DNS prefetching.
app.use(helmet.dnsPrefetchControl());
// Only allow your site to send the referrer for your own pages.
app.use(helmet.referrerPolicy({ policy: 'same-origin' }))

//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//Sample Front-end

    
//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// All values below are Fixme default values unless otherwise overridden here.
fixme({
  path:                 process.cwd(),
  ignored_directories:  ['node_modules/**', '.git/**', '.hg/**'],
  file_patterns:        ['**/*.js', 'Makefile', '**/*.sh'],
  file_encoding:        'utf8',
  line_length_limit:    1000,
  skip:                 []
});

//CONNECT TO DE DB
MDB.connect(()=>{
  //Start our server and tests!
  app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port " + process.env.PORT);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        var error = e;
          console.log('Tests are not valid:');
          console.log(error);
      }
    }, 1500);
  }
  });
})

process.on('SIGINT', function(){
    MDB.close(function(){
      console.log("Mongoose default connection is disconnected due to application termination");
       process.exit(0);
      });
});

module.exports = app; //for testing
