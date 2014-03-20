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
	// callback(poolCluster);
	poolCluster.getConnection('MASTER', 'ORDER', function (err, connection) {
	callback(connection);
	});
};