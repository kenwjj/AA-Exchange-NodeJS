var config = require('../config/config');
var async = require('async');
var connection;

exports.connection = function(callback){
	
	var mysql = require('mysql');

// create
var clusterConfig = {
	removeNodeErrorCount: 1, // Remove the node immediately when connection fails.
	defaultSelector: 'ORDER'
};
var masterConfig = {
	host     : config.masterdbhost,
	user     : config.masterlogin,
	password : config.masterpass,
	database: config.database,
	port: config.masterdbport
};
var slaveConfig = {
	host     : config.slavedbhost,
	user     : config.slavelogin,
	password : config.slavepass,
	database: config.database,
	port: config.slavedbport
};
var poolCluster = mysql.createPoolCluster(clusterConfig);
poolCluster.add('MASTER', masterConfig);
poolCluster.add('SLAVE', slaveConfig);
poolCluster.getConnection('MASTER', 'ORDER', function (err, connection) {
	connection.query('select credit_limit from credit;', function(err, docs) {
					// console.log(docs);
					if(!isEmptyObject(docs)){
						console.log("DB Connected @ "+connection.config.host+":"+connection.config.port+"!");
					}
				});

	callback(connection);

});
	// async.series([
	// 	function(callback){
	// 		poolCluster.getConnection('MASTER', 'ORDER', function (err, connection) {
	// 			connection.query('select credit_limit from credit;', function(err, docs) {
	// 				// console.log(docs);
	// 				if(!isEmptyObject(docs)){
	// 					console.log("DB Connected @ "+connection.config.host+":"+connection.config.port+"!");
	// 				}
	// 			});

	// 				callback(connection);

	// 		});
	// 	}],
	// 	function(connection){

	// 		return connection;

	// 	});
};
// connection = mysql.createConnection({
// 	host     : 'localhost',
// 	user     : 'user',
// 	password : 'user',
// 	database: 'exchange',
// 	port: '3306'
// });

// connection.connect(function(err){
// 	console.log('mysqldb conn started');
// 	connectionState = true;
// });
// //
// connection.on('close', function (err) {
// 	console.log('mysqldb conn close');
// 	connectionState = false;
// });

// connection.on('error', function (err) {
// 	console.log('mysqldb error: ' + err);
// 	connectionState = false;
// 	handleDisconnect();
// });

// return connection;
// };


function handleDisconnect() {
	connection = mysql.createConnection(db_config); 
  // Recreate the connection, since

  // the old one cannot be reused.

  connection.connect(function(err) {              
  // The server is either down
  if(err) {                                    
     // or restarting (takes a while sometimes).
     console.log('error when connecting to db:', err);
     setTimeout(handleDisconnect, 2000); 
      // We introduce a delay before attempting to reconnect,
  }                           
    // to avoid a hot loop, and to allow our node script to
});                      
  // process asynchronous requests in the meantime.
 // If you're also serving http, display a 503 error.
 connection.on('error', function(err) {
 	console.log('db error', err);
 	if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
      // Connection to the MySQL server is usually
// lost due to either server restart, or a
// connnection idle timeout (the wait_timeout
// server variable configures this)
 handleDisconnect();                        
} else {                                      
	throw err;                                  
}
});
}

/*
connection.beginTransaction(function(err) {
  if (err) { throw err; }
  connection.query('INSERT INTO posts SET title=?', title, function(err, result) {
    if (err) { 
      connection.rollback(function() {
        throw err;
      });
    }

    var log = 'Post ' + result.insertId + ' added';

    connection.query('INSERT INTO log SET data=?', log, function(err, result) {
      if (err) { 
        connection.rollback(function() {
          throw err;
        });
      }  
      connection.commit(function(err) {
        if (err) { 
          connection.rollback(function() {
            throw err;
          });
        }
        console.log('success!');
      });
    });
  });
});

*/

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}