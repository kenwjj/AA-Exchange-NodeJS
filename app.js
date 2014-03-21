var cluster = require('cluster');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/routes');
var auth = require('./routes/auth');
var config = require('./config/config');
var bo = require('./routes/backoffice');
var express = require('express');
var fs = require('fs');
var  MySQLStore = require('connect-mysql')(express);
if (cluster.isMaster && config.clustering) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;
    // cpuCount = 1;
    console.log('CPU Count: '+ cpuCount);
    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {

        // Replace the dead worker,
        // we're not sentimental
        console.log('Worker ' + worker.id + ' died :(');
            cluster.fork();

        });
// Code to run if we're in a worker process
} else {

    var app = express();

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    // app.use(favicon());
    // var logFile = fs.createWriteStream('./logs/out.log', {flags: 'a'});
    app.use(logger('dev'));
    // app.use(express.logger({stream: logFile}));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(cookieParser());
    app.use(express.cookieSession({ secret: config.secret, cookie: { maxAge: 60 * 60 * 1000 }}));
    // app.use(express.session({secret: config.secret,store: new MySQLStore(config.sessionOptions)}));
    app.use(routes.appendLocalsToUseInViews);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(app.router);

    //Paths
    app.get('/', routes.index);
    app.get('/login.html',routes.login);
    app.get('/logout.html',routes.logout);

    app.get('/buy.html',auth,routes.buy);
    app.get('/sell.html',auth,routes.sell);
    app.get('/current.html',routes.current);
    app.get('/viewOrders.html',routes.view);
    app.get('/endTradingDay.html',routes.end);

    app.post('/processlogin',routes.processlogin);
    app.post('/processbuy',auth,routes.processbuy);
    app.post('/processsell',auth,routes.processsell);
    app.get('/matchlog',routes.matchlog);
    app.get('/clearbo',require('./routes/backoffice').clearBackoffice);

    /// catch 404 and forwarding to error handler
    // app.use(function(req, res, next) {
    //     var err = new Error('Not Found');
    //     err.status = 404;
    //     next(err);
    // });

    /// error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function(err, req, res, next) {
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: {}
        });
    });

    var debug = require('debug')('my-application');
    app.set('port', process.env.PORT || 8081);

    var server = app.listen(app.get('port'), function() {
      console.log('Express server listening on port ' + server.address().port);
      if(cluster.worker!== null){
          console.log('Worker ' + cluster.worker.id + ' running!');
      }
  });
    
}
module.exports = app;
