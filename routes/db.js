var config = require('../config/config');
var async = require('async');
var connection;
var mysql = require('mysql');
var poolCluster;
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
exports.connection = function(callback){


	poolCluster = mysql.createPoolCluster(clusterConfig);
	poolCluster.add('MASTER', masterConfig);
	poolCluster.add('SLAVE', slaveConfig);
	// callback(poolCluster);
	poolCluster.getConnection(function (err, connection) {
		connection.on('error', function(err) {
			if(err.code === 'PROTOCOL_CONNECTION_LOST'){
				console.log('DB Disconnection',err); // 'ER_BAD_DB_ERROR'
				// var down = true;
				// poolCluster.getConnection(function (err, connection) {
				// 	callback(connection);
				// });
				// while(down){
				//	dbCheck(poolCluster,connection);
				// }
			}
		});

		callback(connection);
	});
};
exports.pool = function(callback){
	poolCluster = mysql.createPoolCluster(clusterConfig);
	poolCluster.add('MASTER', masterConfig);
	poolCluster.add('SLAVE', slaveConfig);
	poolCluster.getConnection(function (err, connection) {
		connection.on('error', function(err) {
			if(err.code === 'PROTOCOL_CONNECTION_LOST'){
				console.log('DB Disconnection',err); // 'ER_BAD_DB_ERROR'
			}
		});
	callback(poolCluster,connection);
	});
};

function timer(delay, callback)
{
	// self-reference
	var self = this;

	// attributes
	var counter = 0;
	var start = new Date().getTime();

	/**
	 * Delayed running of the callback.
	 */
	 function delayed()
	 {
	 	callback(delay);
	 	counter ++;
	 	var diff = (new Date().getTime() - start) - counter * delay;
	 	setTimeout(delayed, delay - diff);
	 }

	// start timer
	delayed();
	setTimeout(delayed, delay);
}