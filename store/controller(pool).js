var async = require('async');
var fs = require('fs');
var soap = require('soap');
var config = require('../config/config');
var bo = require('./backoffice');
var db = require('./db');


var creditLimit = 1000000;
var unfulfilledBids = [];
var unfulfilledAsks = [];
var matchedTransactions = [];
var latestSmuPrice = -1, latestNtuPrice = -1, latestNusPrice = -1;
var matchedLocation = config.matchedLocation;
var rejectedLocation = config.rejectedLocation;

db.connection(function(pool){
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

			addBid(bid, function(code){
				getUnfulfilledAsks(bid.stock,function(list){
					if(list.length === 0){
						callback(true);
						return;
					}
					matchBid(bid,function(status){
						callback(status);
						return;
					});
				});
			});
		});
	};
	function matchBid(bid,callback){
		pool.getConnection(function(err, connection) {
			// console.log('pool connection',err);
			connection.beginTransaction(function(err) {
				if(err){
					console.log('placeNewBidAndAttemptMatch',err);
					throw err;
				}
				var query1 = "SELECT bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1;" ;
				connection.query(query1,[bid.stock], function(err, highestBid) {
					if(highestBid === undefined){
						callback(true);
						return;
					}
					var query2 = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1;";
					connection.query(query2,[bid.stock], function(err, lowestAsk) {
						if(lowestAsk === undefined){
							callback(true);
							return;
						}
						if (lowestAsk[0].price <= highestBid[0].price) {
							var match = {
								highestBid: highestBid[0],
								lowestAsk: lowestAsk[0],
								date: highestBid[0].time,
								price: highestBid[0].price,
								stock:highestBid[0].stock
							};
							var query3 = "Insert into matched (stock, bidder, seller, amt, datetime) values (?,?,?,?,?);";
							connection.query(query3,[match.stock, match.highestBid.bidder, match.lowestAsk.seller, match.price,match.date], function(err, docs) {

								var query4 = "Update exchange.bid set status='matched' where id = ?;";
								connection.query(query4,[highestBid[0].id], function(err, docs) {
									var query5 = "Update exchange.ask set status='matched' where id = ?; ";
									connection.query(query5,[lowestAsk[0].id], function(err, docs) {
										logMatchedTransactions(match);
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
exports.placeNewAskAndAttemptMatch = function(ask,callback) {

	ask.status = 'unfulfilled';
	addAsk(ask,function(code){
		getUnfulfilledBids(ask.stock,function(list){
			if(list.length === 0){
				callback(true);
				return;
			}
			matchAsk(ask,function(status){
				callback(status);
				return;
			});
		});
	});
};
function matchAsk(ask,callback){
	pool.getConnection(function(err, connection) {
		connection.beginTransaction(function(err) {
			if(err){
				console.log('placeNewBidAndAttemptMatch',err);
				throw err;
			}
			var query1 = "SELECT bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1;" ;
			connection.query(query1,[ask.stock], function(err, highestBid) {
				if(highestBid === undefined){
					callback(true);
					return;
				}
				var query2 = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1;";
				connection.query(query2,[ask.stock], function(err, lowestAsk) {
					if(lowestAsk === undefined){
						callback(true);
						return;
					}
					if (lowestAsk[0].price <= highestBid[0].price) {
						var match = {
							highestBid: highestBid[0],
							lowestAsk: lowestAsk[0],
							date: lowestAsk[0].time,
							price: lowestAsk[0].price,
							stock:highestBid[0].stock
						};
						var query3 = "Insert into matched (stock, bidder, seller, amt, datetime) values (?,?,?,?,?);";
						connection.query(query3,[match.stock, match.highestBid.bidder, match.lowestAsk.seller, match.price,match.date], function(err, docs) {

							var query4 = "Update exchange.bid set status='matched' where id = ?;";
							connection.query(query4,[highestBid[0].id], function(err, docs) {
								var query5 = "Update exchange.ask set status='matched' where id = ?; ";
								connection.query(query5,[lowestAsk[0].id], function(err, docs) {
									logMatchedTransactions(match);
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
// check if a buyer is eligible to place an order based on his credit limit
// if he is eligible, this method adjusts his credit limit and returns true
// if he is not eligible, this method logs the bid and returns false
function validateCreditLimit(bid, callback) {
	
	getCreditRemaining(bid.username,function(remains){
		var status;
		var left = remains.credit_limit;
		var cost= bid.price * 1000;
		var newAmt = left - cost;
		if (newAmt < 0) {
				//log rejected order
				callback(false);
			} else {
				setCreditRemaining(bid.username, newAmt,function(){
					callback(true);
				});
				
			}
		});
}
// retrieve unfulfiled current (highest) bid for a particular stock
// returns null if there is no unfulfiled bid for this stock
function getHighestBid(stock,callback) {
	var query = "SELECT bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1" ;
	pool.getConnection(function(err, connection) {
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}
// returns the lowest ask for a particular stock
// returns -1 if there is no ask at all
function getLowestAsk(stock,callback) {

	var query = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1";
	pool.getConnection(function(err, connection) {
		connection.query(query,[stock], function(err, docs) {
			release.connection();
			callback(docs);
		});
	});
}
// Logging
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
	fs.appendFile(matchedLocation, matchString, function(err){
		if(err) {
			console.log('logMatchedTransactions',err);
		} else {
			
			// console.log("Match recorded!\n"+matchString);
		}
		if(rep !== 'rep' && config.syncmatch){
			sendRequest(config.host,matchString,function(text){
				// console.log(text);
			});
		}
	}); 
}
function sendRequest(host,matchString,callback){
	var http = require('http');
	var port = '8081';
	for(var i = 0; i < config.hosts.length; i++){
		var host = config.hosts[i];
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

				console.log('Match Log Sync Success');
				
			});

		}).on("error",function(e){
			console.log("Send Request for matchlog not successful: " + e);
		});
	}
}
// DB Functions
function getCreditRemaining(username,callback) {
	pool.getConnection(function(err, connection) {
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

	pool.getConnection(function(err, connection) {
		connection.query('update credit set credit_limit=? where userid=?', [credit_limit, username],function(err, docs) {
			if(err){
				console.log('setCreditRemaining',err);
			}
			connection.release();
			callback(docs);
		});
	});

}

function insertCreditRemaining (username,credit_limit,callback) {
	pool.getConnection(function(err, connection) {
		connection.query('insert into credit values(?,?,?);', [username,credit_limit,''],function(err, docs) {
			connection.release();
			if(err){
				console.log(insertCreditRemaining,err);
			}else{

				callback(docs);
			}
		});
	});
}
exports.getLatestPrice = function(stock,callback) {
	pool.getConnection(function(err, connection) {
		var query = "select amt from matched where stock = ? and datetime = (select max(datetime) from matched where stock = ?)";
		pool.getConnection(function(err, connection) {
			connection.release();
			connection.query(query,[stock,stock], function(err, docs) {
				if(isEmptyObject(docs)){
					callback('-1');
				}else{
					callback(docs[0].amt);
				}
			});
		});
	});
};

exports.getHighestBidPrice = function(stock,callback) {
	var query = "SELECT price from bid where stock = ? order by price desc limit 1;" ;
	pool.getConnection(function(err, connection) {
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
	var query = "SELECT price from ask where stock = ? order by price asc limit 1;" ;
	pool.getConnection(function(err, connection) {
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

exports.getLowestAsk = function(stock) {
	var lowestAsk = {
		price: creditLimit
	};
	for (var i = 0; i < unfulfilledAsks.length; i++) {
		var ask = unfulfilledAsks[i];
		if (ask.stock === stock && ask.price <= lowestAsk.price) {
			if (ask.price === lowestAsk.price) {
				if (ask.date.getTime() < lowestAsk.date.getTime()) {
					lowestAsk = ask;
				}
			} else {
				lowestAsk = ask;
			}
		}
	}
	if (typeof lowestAsk.userId === 'undefined') {
		return;
	}
	return lowestAsk;
};

exports.getUnfulfilledBidsAll = function(callback){
	var query = "Select * from bid where status = 'unfulfilled'";
	pool.getConnection(function(err, connection) {
		connection.query(query, function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}
		});
	});
};


exports.getUnfulfilledAsksAll = function(callback){
	var query = "Select * from ask where status = 'unfulfilled'";
	pool.getConnection(function(err, connection) {
		connection.query(query, function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}
		});
	});
};

exports.getUnfulfilledBids = function(stock,callback){
	callback(getUnfulfilledBids(stock,callback));
};

function getUnfulfilledBids(stock,callback) {
	var bidList = [];
	var query = "Select * from bid where stock = ? and status = 'unfulfilled'";

	pool.getConnection(function(err, connection) {
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			if(!err){
				callback(docs);
			}else{
				console.log('getUnfulfilledBids',err);
			}

		});
	});
}
exports.getUnfulfilledAsks = function(stock,callback){
	callback(getUnfulfilledAsks(stock,callback));
};
function getUnfulfilledAsks(stock,callback) {

	var query = "Select * from ask where stock = ? and status = 'unfulfilled'";
	pool.getConnection(function(err, connection) {
		connection.query(query,[stock], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});

}

exports.getAllCreditRemainingForDisplay = function (callback){
	pool.getConnection(function(err, connection) {
		connection.query('select * from credit', function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
};

exports.endTradingDay = function(){
	// reset attributes
	latestPriceForSmu = -1;
	latestPriceForNus = -1;
	latestPriceForNtu = -1;

	// dump all unfulfilled buy and sell orders
	unfulfilledAsks.length = 0;
	unfulfilledBids.length = 0;
	pool.getConnection(function(err, connection) {
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
						}
						if(config.sendtobackoffice){
							// Send to BackOffice
							bo.sendToBackOffice(function(status){
								if(status){
									console.log('Successfully sent to back office!');
								}else{
									console.log('Something went wrong with BackOffice operation!');
								}
							});
						}else{
							fs.unlink(config.matchedLocation, function (err) {
								if (err) throw err;
								console.log('successfully deleted matched.log');
							});
						}		
					});
				}
			});
		});
	});
};

function addBid(bid, callback){
	var query = "Insert into bid (bidder,stock,price,time,status) value (?,?,?,?,?);";
	pool.getConnection(function(err, connection) {
		connection.query(query,[bid.username, bid.stock, bid.price, bid.date, bid.status], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}

function addAsk(ask, callback){
	var query = "Insert into ask (seller,stock,price,time,status) value (?,?,?,?,?);";
	pool.getConnection(function(err, connection) {
		connection.query(query,[ask.username, ask.stock, ask.price, ask.date, ask.status], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}

function addMatch(match, callback){
	var query = "Insert into matched (stock, bidder, seller, amt, datetime) values (?,?,?,?,?);";
	pool.getConnection(function(err, connection) {
		connection.query(query,[match.stock, match.highestBid.bidder, match.lowestAsk.seller, match.price,match.date], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}
function updateBidMatch(bid, callback){
	var query = "Update exchange.bid set status='matched' where id = ?;";
	pool.getConnection(function(err, connection) {
		connection.query(query,[bid.id], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}
function updateAskMatch(ask, callback){
	var query = "Update exchange.ask set status='matched' where id = ?; ";
	pool.getConnection(function(err, connection) {
		connection.query(query,[ask.id], function(err, docs) {
			connection.release();
			callback(docs);
		});
	});
}

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}
});