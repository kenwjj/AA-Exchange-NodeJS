var async = require('async');
var fs = require('fs');
var soap = require('soap');
var config = require('../config/config');
var bo = require('./backoffice');
var db = require('./db');
db.pool(function(pool){

	var creditLimit = config.creditlimit;
	var unfulfilledBids = [];
	var unfulfilledAsks = [];
	var matchedLocation = config.matchedLocation;
	var rejectedLocation = config.rejectedLocation;
	exports.placeNewBidAndAttemptMatch = function(bid,callback){
		validateCreditLimit(bid, function(okToContinue){
			var status;
			if (!okToContinue) {
				status = false;
				bid.status = 'rejected';
				addBid(bid, function(){
					logRejectedBuyOrder(bid);
					callback(status);
					return;
				});
			}
			bid.status = true;
			bid.status = 'unfulfilled';
			pool.getConnection(function (err, connection) {
				connection.beginTransaction(function(err) {
					addBid(bid, function(code){
						connection.commit(function(err) {
							if(err){
								connection.rollback(function() {
									console.log('rollback!');
									throw err;
								});
							}
						});
						getUnfulfilledAsks(bid.stock,function(list){
							if(list.length === 0){
								callback(true);
								return;
							}
							matchStock(bid,'bid',function(status){
								connection.release();
								callback(status);
								return;
							});
						});
					});
				});
				
			});
		});
	};
	exports.placeNewAskAndAttemptMatch = function(ask,callback) {

		ask.status = 'unfulfilled';
		pool.getConnection(function (err, connection) {
			connection.beginTransaction(function(err) {
				addAsk(ask,function(code){
					connection.commit(function(err) {
						if(err){
							connection.rollback(function() {
								
								console.log('rollback!');
								throw err;
							});
						}
					});
					getUnfulfilledBids(ask.stock,function(list){
						if(list.length === 0){
							callback(true);
							return;
						}
						matchStock(ask,'ask',function(status){
							connection.release();
							callback(status);
							return;
						});
					});
				});
			});
		});
	};
	function matchStock(bid,type,callback){
		pool.getConnection(function (err, connection) {
			connection.beginTransaction(function(err) {
				getHighestBid(bid.stock,function(highestBid){
					getLowestAsk(bid.stock,function(lowestAsk){

						if(highestBid.length<1||lowestAsk.length < 1){callback(true);}

						if (lowestAsk[0].price <= highestBid[0].price) {
							var match;
							if(type === 'bid'){
								match = {
									highestBid: highestBid[0],
									lowestAsk: lowestAsk[0],
									date: highestBid[0].time,
									price: lowestAsk[0].price,
									stock:highestBid[0].stock
								};
							}else{
								match = {
									highestBid: highestBid[0],
									lowestAsk: lowestAsk[0],
									date: lowestAsk[0].time,
									price: highestBid[0].price,
									stock:highestBid[0].stock
								};
							}


							var query4 = "Update exchange.bid set status='matched' where id = ?;";
							connection.query(query4,[highestBid[0].id], function(err, docs) {

								if(err){
									console.log('da update1',err);
									connection.rollback(function() {
										console.log('rollback!');
									// throw err;
								});
								}else{
									var query5 = "Update exchange.ask set status='matched' where id = ?; ";
									connection.query(query5,[lowestAsk[0].id], function(err, docs) {

										if(err){
											console.log('da update2',err);
											connection.rollback(function() {
												console.log('rollback!');
												throw err;
											});
										}else{
											var query3 = "Insert into matched (stock, bidder, seller, amt, datetime,bidid,askid) values (?,?,?,?,?,?,?);";
											connection.query(query3,[match.stock, match.highestBid.bidder, match.lowestAsk.seller, match.price,match.date,highestBid[0].id,lowestAsk[0].id], function(err, docs) {

												if(err){
													console.log('da update1',err);
													connection.rollback(function() {
														console.log('rollback!');
													// throw err;
												});
												}else{
													connection.commit(function(err) {
														if(err){
															connection.rollback(function() {
																console.log('rollback!');
															// throw err;
														});
														}
														logMatchedTransactions(match);
														bo.sendToBackOffice(match,function(status){
															if(status){
																console.log('Successfully sent to back office!');
															}else{
																console.log('Something went wrong with BackOffice operation!');
															}
														});
														connection.release();
														callback(true);
														return;
													});
												}
											});
}
});
}
});
}
connection.commit(function(err) {
	if(err){
		connection.rollback(function() {
			console.log('rollback!');
			throw err;
		});
	}
	connection.release();
	callback(true);
	return;
});
});
});
});
});
}

function validateCreditLimit(bid, callback) {
	
	var cost= bid.price * 1000;
	var username = bid.username;
	pool.getConnection(function (err, connection) {
		connection.beginTransaction(function(err){
			getCreditRemaining(connection,bid.username,function(remains,err){

				var newAmt = remains.credit_limit - cost;

				if (newAmt < 0) {
					connection.commit(function(err) {
						if(err){
							connection.rollback(function() {
								console.log('rollback!');
								throw err;
							});
						}
						connection.release();
						callback(false);
					});
				}

				var query = 'select credit_limit from credit where userid = ?;';
				connection.query(query,bid.username, function(err, docs) {

					var query2 = 'update credit set credit_limit=? where userid=?';
					connection.query(query2, [newAmt, bid.username],function(err, docs) {
						if(err){
							console.log('setCreditRemaining',err);
						}
						connection.commit(function(err) {
							if(err){
								connection.rollback(function() {
									console.log('rollback!');
									throw err;
								});
							}
							connection.release();
							callback(true);
						});
					});
				});
			});
		});
	});
}

function getCreditRemaining(connection, username,callback) {
	pool.getConnection(function (err, connection) {
		connection.query('select credit_limit from credit where userid = ?;',[username], function(err, docs) {
			connection.release();
			if(err){
				console.log('getCreditRemaining',err);
			}
			if(isEmptyObject(docs)){
				insertCreditRemaining(username,creditLimit, function(result){
					var obj = [];
					obj.credit_limit = creditLimit;
					docs.push(obj);
					callback(docs[0]);
				});
			}else{
				callback(docs[0]);
			}

		});
	});
}

function setCreditRemaining (username,credit_limit,callback) {
	pool.getConnection(function (err, connection) {
		connection.query('update credit set credit_limit=? where userid=?', [credit_limit, username],function(err, docs) {
			connection.release();
			if(err){
				console.log('setCreditRemaining',err);
			}
			callback(docs);
		});
	});

}

function insertCreditRemaining (username,credit_limit,callback) {
	pool.getConnection(function (err, connection) {
		connection.query('insert into credit values(?,?,?) ON DUPLICATE KEY Update userid=?,credit_limit=?;', [username,credit_limit,'',username,credit_limit],function(err, docs) {
			connection.release();
			if(err){
				console.log('insertCreditRemaining',err);
			}else{
				callback(docs);
			}
		});
	});
}

exports.endTradingDay = function(){
	pool.getConnection(function (err, connection) {
		connection.query('Truncate table credit;', function(err, docs) {
			if(!err){
				console.log('Credit Cleared!');
			}
			connection.query('Truncate table bid;', function(err, docs) {
				if(!err){
					console.log('Bid Cleared!');
					connection.query('Truncate table ask;', function(err, docs) {
						connection.release();
						if(!err){
							console.log('Ask Cleared!');
							bo.clearBackoffice(function(status){
								if(status && config.sendtobackoffice){
								// Send to BackOffice
								bo.sendToBackOfficeEnd(function(status){
									if(status){
										console.log('Successfully sent to back office!');
									}else{
										console.log('Something went wrong with BackOffice operation!');
									}
								});
							}else{
								// fs.unlink(config.matchedLocation, function (err) {
								// 	if (err) throw err;
								// 	console.log('Successfully deleted matched.log');
								// });
							}
						});
						}
					});
				}

			});
		});
	});

};

// ================ CRUD  ================ 

function addBid(bid, callback){
	pool.getConnection(function (err, connection) {
		var query = "Insert into bid (bidder,stock,price,time,status) value (?,?,?,?,?);";
		connection.query(query,[bid.username, bid.stock, bid.price, bid.date, bid.status], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}

function addAsk(ask, callback){
	pool.getConnection(function (err, connection) {
		var query = "Insert into ask (seller,stock,price,time,status) value (?,?,?,?,?);";
		connection.query(query,[ask.username, ask.stock, ask.price, ask.date, ask.status], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});

}
exports.getAllCreditRemainingForDisplay = function (callback){
	pool.getConnection(function (err, connection) {
		connection.query('select * from credit', function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
};

exports.getUnfulfilledBids = function(stock,callback){
	callback(getUnfulfilledBids(stock,callback));
};
function getUnfulfilledBids(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "Select * from bid where stock = ? and status = 'unfulfilled'";
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}
		});
	});
	
}
exports.getUnfulfilledAsks = function(stock,callback){
	callback(getUnfulfilledAsks(stock,callback));
};
function getUnfulfilledAsks(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "Select * from ask where stock = ? and status = 'unfulfilled'";
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});

}

exports.getUnfulfilledBidsAll = function(callback){
	pool.getConnection(function (err, connection) {
		var query = "Select * from bid where status = 'unfulfilled'";
		connection.query(query, function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}
		});
	});

};
exports.getUnfulfilledAsksAll = function(callback){
	pool.getConnection(function (err, connection) {
		var query = "Select * from ask where status = 'unfulfilled'";
		connection.query(query, function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}
		});
	});

};
exports.getLatestPrice = function(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "select amt from matched where stock = ? and datetime = (select max(datetime) from matched where stock = ?)";
		connection.query(query,[stock,stock], function(err, docs) {
			connection.release();
			if(isEmptyObject(docs)){
				callback('-1');
			}else{
				callback(docs[0].amt);
			}
		});
	});

};
exports.getHighestBidPrice = function(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "SELECT price from bid where stock = ? and status = 'unfulfilled' order by price desc limit 1;" ;
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			if(isEmptyObject(docs)){
				callback('-1');
			}else{
				callback(docs[0].price);
			}
		});
	});

};

exports.getLowestAskPrice = function(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "SELECT price from ask where stock = ? and status = 'unfulfilled' order by price asc limit 1;" ;
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			if(isEmptyObject(docs)){
				callback('-1');
			}else{
				callback(docs[0].price);
			}
		});
	});

};

// retrieve unfulfiled current (highest) bid for a particular stock
// returns null if there is no unfulfiled bid for this stock
function getHighestBid(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "SELECT bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1;" ;
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});

}
// returns the lowest ask for a particular stock
// returns -1 if there is no ask at all
function getLowestAsk(stock,callback) {
	pool.getConnection(function (err, connection) {
		var query = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1;";
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}

// ================ Logging  ================ 
function logRejectedBuyOrder(bid) {
	var bidString = "stock: " + bid.stock + ", price: " + bid.price + ", userId: " + bid.username + ", date: " + bid.date.toString() + "\r\n";
	fs.appendFile(rejectedLocation, bidString, function(err) {
		if(err) {
			console.log('logRejectedBuyOrder',err);
		} else {
			console.log("Reject recorded!\n"+bidString);
		}
	});
}
exports.logMatchedTransactions = function(match,rep){
	logMatchedTransactions(match,rep);
};
function logMatchedTransactions(match,rep) {

	var matchString = '';
	if(rep ==='rep'){
		matchString = match;
	}else{
		matchString  = "stock: " + match.stock + ", price: " + match.price + ", bidder userId: " + match.highestBid.bidder + ", seller userId: " + match.lowestAsk.seller +", date: " + match.date.toString() + "\r\n";
	}
	fs.appendFileSync(matchedLocation, matchString);

	if(rep !== 'rep' && config.syncmatch){
		sendRequest(config.host,matchString,function(text){
		});
	}
}
function sendRequest(host,matchString,callback){
	var http = require('http');
	var port = config.listenport;
	for(var i = 0; i < config.hosts.length; i++){
		host = config.hosts[i];
		var options = {
			host: host,
			port:port,
			method : 'GET',
			path: '/matchlog?match='+encodeURIComponent(matchString)
		};
		var req = http.get(options, function(res) {
			var result = '';
			res.on('data', function(chunk) {
				result += chunk;
			});
			res.on('end', function() {
				// console.log('Match Log Sync Success');
			});
		}).on("error", function(e){
			console.log("Send Request for matchlog not successful: " + e);
		});
	}
}

});


