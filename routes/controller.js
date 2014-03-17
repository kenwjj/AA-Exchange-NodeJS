var async = require('async');
var fs = require('fs');
var soap = require('soap');
var config = require('../config/config');
var bo = require('./backoffice');
var db = require('./db');
db.connection(function(connection){

	var creditLimit = 1000000;
	var unfulfilledBids = [];
	var unfulfilledAsks = [];
	var matchedTransactions = [];
	var latestSmuPrice = -1, latestNtuPrice = -1, latestNusPrice = -1;
	var matchedLocation = config.matchedLocation;
	var rejectedLocation = config.rejectedLocation;


	exports.placeNewBidAndAttemptMatch = function(bid,callback){
	// var okToContinue;
	//check limit set to db

	async.series([
		function(callback){
			// step 0: check if this bid is valid based on the buyer's credit limit
			validateCreditLimit(bid, callback);

		}],
		function(okToContinue){
			var status;
			if (!okToContinue) {
				// add rejected bid here
				status = false;
				bid.status = 'rejected';
				addBid(bid, function(){
					
					logRejectedBuyOrder(bid);
					callback(status);
				});
			}else{
				
				bid.status = true;
				bid.status = 'unfulfilled';
				// unfulfilledBids.push(bid)
				// step 1: insert new bid into unfulfilledBids;
				addBid(bid, function(){
					// check amt of stocks in the ask list

					// step 2: check if there is any unfulfilled asks (sell orders) for the
					// new bid's stock. if not, just return
					// count keeps track of the number of unfulfilled asks for this stock
					getUnfulfilledAsks(bid.stock,function(list){

						if(list.length === 0){
							callback(true);
							return;
						}else if(list.length < 0){
							console.log('something went wrong');
						}

						// step 3: identify the current/highest bid in unfulfilledBids of the
						// same stock
						getHighestBid(bid.stock,function(highestBid){
							// step 4: identify the current/lowest ask in unfulfilledAsks of the
							// same stock
							getLowestAsk(bid.stock, function(lowestAsk){
								// step 5: check if there is a match.
								// A match happens if the lowest ask is <= highest bid
								if (highestBid[0].price >= lowestAsk[0].price) {
									// this is a BUYING trade - the transaction happens at the higest
									// bid's timestamp, and the transaction price happens at the lowest
									// ask
									var match = {
										highestBid: highestBid[0],
										lowestAsk: lowestAsk[0],
										date: highestBid[0].time,
										price: highestBid[0].price,
										stock:highestBid[0].stock
									};
									addMatch(match,function(){

										updateBidMatch(highestBid[0],function(status1){
											updateAskMatch(lowestAsk[0], function(status2){
												updateLatestPrice(match);
												logMatchedTransactions(match);
												callback(true);
											});

										});

									});


								}
								callback(true);
							});


						});						

});

});

}

}
);

};
	// var count = 0;
	// for (var i = 0; i < unfulfilledAsks.length; i++) {
	// 	if (unfulfilledAsks[i].stock === bid.stock) {
	// 		count++;
	// 	}
	// }

	// // not in list just return no matches
	// if (count === 0) {
	// 	status = true;
	// }

	// // given a particular stock find the highest bid price
	// var highestBid = getHighestBid(bid.stock),

	// // given the stock find the lowest ask price
	// lowestAsk = getLowestAsk(bid.stock);


	// if (typeof lowestAsk !== 'undefined' && typeof highestBid !== 'undefined' && highestBid.price >= lowestAsk.price) {
	// 	var bidIndex = unfulfilledBids.indexOf(highestBid),
	// 	askIndex = unfulfilledAsks.indexOf(lowestAsk);

	// 	unfulfilledBids.splice(bidIndex, 1);
	// 	unfulfilledAsks.splice(askIndex, 1);

	// 	var match = {
	// 		highestBid: highestBid,
	// 		lowestAsk: lowestAsk,
	// 		date: lowestAsk.date,
	// 		price: highestBid.price,
	// 		stock: highestBid.stock
	// 	};
	// 	matchedTransactions.push(match);
	// 	updateLatestPrice(match);
	// 	logMatchedTransactions();
	// }

	// status = true;
	// callback(status);

// });
exports.placeNewAskAndAttemptMatch = function(ask,callback) {


	async.series([
		function(callback){
			ask.status = 'unfulfilled';
			addAsk(ask,callback);
		}],function(result){
			// step 1: insert new ask into unfulfilledAsks
			getUnfulfilledBids(ask.stock,function(list){
				// step 2: check if there is any unfulfilled bids (buy orders) for the
				// new ask's stock. if not, just return
				// count keeps track of the number of unfulfilled bids for this stock

				if(list.length === 0){
					callback(true);
					return;
				}else if(list.length < 0){
					console.log('something went wrong');
				}

				// step 3: identify the current/highest bid in unfulfilledBids of the same stock
				getHighestBid(ask.stock,function(highestBid){
					// step 4: identify the current/lowest ask in unfulfilledAsks of the same stock
					getLowestAsk(ask.stock, function(lowestAsk){
						// step 5: check if there is a match.
						// A match happens if the lowest ask is <= highest bid

						if (lowestAsk[0].price <= highestBid[0].price) {
							// this is a SELLING trade - the transaction happens at the lowest
							// ask's timestamp, and the transaction price happens at the highest
							var match = {
								highestBid: highestBid[0],
								lowestAsk: lowestAsk[0],
								date: highestBid[0].time,
								price: highestBid[0].price,
								stock:highestBid[0].stock
							};
							addMatch(match,function(){

								updateBidMatch(highestBid[0],function(status1){
									updateAskMatch(lowestAsk[0], function(status2){
										updateLatestPrice(match);
										logMatchedTransactions(match);
										callback(true);
									});

								});

							});
						}
						callback(true);
					});


				});

});

}

);
// async.series([
// 	function(callback){
// 		validateCreditLimit(ask, callback);
// 	}],function(okToContinue){
// 		var status;
// 		if (!okToContinue) {
// 			status = false;
// 			callback(status);
// 		}
// 		unfulfilledAsks.push(ask);

// 		var count = 0;
// 		for (var i = 0; i < unfulfilledBids.length; i++) {
// 			if (unfulfilledBids[i].stock === ask.stock) {
// 				count++;
// 			}
// 		}
// 		if (count === 0) {
// 			status = true;
// 		}

// 		var highestBid = getHighestBid(ask.stock),
// 		lowestAsk = getLowestAsk(ask.stock);
// 		if (typeof lowestAsk !== 'undefined' && typeof highestBid !== 'undefined' && lowestAsk.price <= highestBid.price) {
// 			var bidIndex = unfulfilledBids.indexOf(highestBid),
// 			askIndex = unfulfilledAsks.indexOf(lowestAsk);

// 			unfulfilledBids.splice(bidIndex, 1);
// 			unfulfilledAsks.splice(askIndex, 1);

// 			var match = {
// 				highestBid: highestBid,
// 				lowestAsk: lowestAsk,
// 				date: lowestAsk.date,
// 				price: highestBid.price,
// 				stock: highestBid.stock
// 			};
// 			matchedTransactions.push(match);
// 			updateLatestPrice(match);
// 			logMatchedTransactions();
// 		}
// 		status = true;
// 		callback(status);
// 	});
};


function updateLatestPrice(match) {
	var stock = match.stock,
	price = match.price;
	// update the correct attribute
	if (stock === "smu") {
		latestSmuPrice = price;
	} else if (stock === "nus") {
		latestNusPrice = price;
	} else if (stock === "ntu") {
		latestNtuPrice = price;
	}

}


// check if a buyer is eligible to place an order based on his credit limit
// if he is eligible, this method adjusts his credit limit and returns true
// if he is not eligible, this method logs the bid and returns false
function validateCreditLimit(bid, callback) {
	
	async.series([
		function(callback){
			getCreditRemaining(bid.username,callback);
		}],
		function(remains){
			var status;
			var left = remains.credit_limit;
			var cost= bid.price * 1000;
			var newAmt = left - cost;
			if (newAmt < 0) {
				//log rejected order
				status =  false;
			} else {
				setCreditRemaining(bid.username, newAmt);
				status =  true;
			}
			callback(status);
		});
}
// retrieve unfulfiled current (highest) bid for a particular stock
// returns null if there is no unfulfiled bid for this stock
function getHighestBid(stock,callback) {

	var query = "SELECT bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1 for update;" ;
	// async.series([
		// function(callback){
		// 	var db = require('./db');
		// 	var connection = db.connection(callback);
		// }],function(connection){
			connection.query(query,[stock], function(err, docs) {
				callback(docs);
			});
		// });

	// var highestBid = {
	// 	price: 0
	// };
	// for (var i = 0; i < unfulfilledBids.length; i++) {
	// 	var bid = unfulfilledBids[i];
	// 	if (bid.stock === stock && bid.price >= highestBid.price) {
	// 		if (bid.price === highestBid.price) {
	// 			if (bid.date.getTime() < highestBid.date.getTime()) {
	// 				highestBid = bid;
	// 			}
	// 		} else {
	// 			highestBid = bid;
	// 		}
	// 	}
	// }
	// if (typeof highestBid.userId === 'undefined') {
	// 	return;
	// }
	// return highestBid;
}
// returns the lowest ask for a particular stock
// returns -1 if there is no ask at all
function getLowestAsk(stock,callback) {

	var query = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1 for update;";

	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
		connection.query(query,[stock], function(err, docs) {
				// console.log(docs);
				callback(docs);
			});
		// });



	// var lowestAsk = {
	// 	price: 999999
	// };
	// for (var i = 0; i < unfulfilledAsks.length; i++) {
	// 	var ask = unfulfilledAsks[i];
	// 	if (ask.stock === stock && ask.price <= lowestAsk.price) {
	// 		if (ask.price === lowestAsk.price) {
	// 			if (ask.date.getTime() < lowestAsk.date.getTime()) {
	// 				lowestAsk = ask;
	// 			}
	// 		} else {
	// 			lowestAsk = ask;
	// 		}
	// 	}
	// }
	// if (typeof lowestAsk.userId === 'undefined') {
	// 	return;
	// }
	// return lowestAsk;
}


// Logging
function logRejectedBuyOrder(bid) {
	var bidString = "stock: " + bid.stock + ", price: " + bid.price + ", userId: " + bid.username + ", date: " + bid.date.toString() + "\r\n";
	fs.appendFile(rejectedLocation, bidString, function(err) {
		if(err) {
			console.log(err);
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
	fs.appendFile(matchedLocation, matchString, function(err) {
		if(err) {
			console.log(err);
		} else {
			
			console.log("Match recorded!\n"+matchString);
		}
		if(rep !== 'rep'){
			sendRequest(config.host,matchString,function(text){
				// console.log(text);
			});
		}
	}); 


	// make request to sync with other hosts

	

}
function sendRequest(host,matchString,callback){
	var http = require('http');
	var host = config.hosts[0];
	var port = '8081';
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

	}).on("error", function(e){
		console.log("Got error: " + e);
	});
}
// DB Functions
function getCreditRemaining(username,callback) {
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		db.connection(callback);

	// 	}],
	// 	function(connection){

		connection.query('select credit_limit from credit where userid = ?',[username], function(err, docs) {
			if(!err){
			// console.log("docs 1");
			// console.log(docs);
		}else{
			// console.log("error 1 "+err);
		}
		if(isEmptyObject(docs)){
			insertCreditRemaining(username,creditLimit);
			var obj = [];
			obj.credit_limit = creditLimit;
			docs.push(obj);
			// console.log(docs);
		}
		callback(docs[0]);
		// return docs;
	// });
	});
	}
	function setCreditRemaining (username,credit_limit) {


	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		db.connection(callback);

	// 	}],
	// 	function(connection){

		connection.query('update credit set credit_limit=? where userid=?', [credit_limit, username],function(err, docs) {
			if(!err){
			// console.log("docs 2");
			// console.log(docs);
		} else{
			// console.log("error 2 "+err);
		}
		return docs;
		// callback(docs[0]);
	});
		// });
}

function insertCreditRemaining (username,credit_limit) {
	
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		db.connection(callback);

	// 	}],
	// 	function(connection){

		connection.query('insert into credit values(?,?)', [username,credit_limit],function(err, docs) {
			if(!err){
			// console.log("docs 2");
			// console.log(docs);
		} else{
			// console.log("error 2 "+err);
		}
		console.log("insertCreditRemaining: "+docs);
		return docs;
		// callback(docs[0]);
	});
		// });
}
exports.getLatestPrice = function(stock,callback) {

	var query = "select amt from matched where stock = ? and datetime = (select max(datetime) from matched where stock = ?)";
	// async.series([
		// function(cb){
		// 	var db = require('./db');
		// 	var connection = db.connection(cb);
		// }],function(connection){
			connection.query(query,[stock,stock], function(err, docs) {
				if(isEmptyObject(docs)){
					callback('-1');
				}else{
					callback(docs[0].amt);
				}
			});
		// });
};

exports.getHighestBidPrice = function(stock,callback) {
	var query = "SELECT price from bid where stock = ? order by price desc limit 1;" ;
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
		// }],function(connection){
			connection.query(query,[stock], function(err, docs) {
				if(isEmptyObject(docs)){
					callback('-1');
				}else{
					callback(docs[0].price);
				}
			});
		// });
};

exports.getLowestAskPrice = function(stock,callback) {
	var query = "SELECT price from ask where stock = ? order by price asc limit 1;" ;
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
		connection.query(query,[stock], function(err, docs) {
			if(isEmptyObject(docs)){
				callback('-1');
			}else{
				callback(docs[0].price);
			}
		});
		// });
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
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		db.connection(callback);

	// 	}],
	// 	function(connection){
		connection.query(query, function(err, docs) {
			if(!err){
				callback(docs);
			}
		});
		// });
};


exports.getUnfulfilledAsksAll = function(callback){
	var query = "Select * from ask where status = 'unfulfilled'";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		db.connection(callback);

	// 	}],
	// 	function(connection){
		connection.query(query, function(err, docs) {
			if(!err){
				callback(docs);
			}
		// 	});
	});
	};

	exports.getUnfulfilledBids = function(stock,callback){
		callback(getUnfulfilledBids(stock,callback));
	};
// exports.getUnfulfilledBids= function(stock,callback) {
	function getUnfulfilledBids(stock,callback) {
		var bidList = [];
		var query = "Select * from bid where stock = ? and status = 'unfulfilled'";
		// async.series([
		// 	function(callback){
		// 		var db = require('./db');
		// 		db.connection(callback);

		// 	}],
		// 	function(connection){

			connection.query(query,[stock], function(err, docs) {
				if(!err){
			// console.log("docs 1");
			// console.log(docs);
			callback(docs);
		}else{
			console.log("error 1 "+err);
		}
		// if(isEmptyObject(docs)){
		// 	insertCreditRemaining(username,creditLimit);
		// 	var obj = [];
		// 	obj.credit_limit = creditLimit;
		// 	docs.push(obj);
		// 	// console.log(docs);
		// }
		// callback(docs[0]);
		// return docs;
	// });
		});


	// for (var i = 0; i < unfulfilledBids.length; i++) {
	// 	var bid = unfulfilledBids[i];
	// 	if (bid.stock === stock) {
	// 		console.log(bid);
	// 		bidList.push(bid);
	// 	}
	// }
	// return bidList;
};
exports.getUnfulfilledAsks = function(stock,callback){
	callback(getUnfulfilledAsks(stock,callback));
};
// exports.getUnfulfilledAsks = function(stock,callback) {
	function getUnfulfilledAsks(stock,callback) {
	// var askList = [];
	var query = "Select * from ask where stock = ? and status = 'unfulfilled'";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
	// 		var returnString = '';
	connection.query(query,[stock], function(err, docs) {
		callback(docs);
	});
		// });
	// return askList;
};

exports.getAllCreditRemainingForDisplay = function (callback){
	// get the credit limit for all users from database. #SD#
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
			// var returnString = '';
			connection.query('select * from credit', function(err, docs) {
				callback(docs);

			});
		// });
};

exports.endTradingDay = function(){
    // reset attributes
    latestPriceForSmu = -1;
    latestPriceForNus = -1;
    latestPriceForNtu = -1;

    // dump all unfulfilled buy and sell orders
    unfulfilledAsks.length = 0;
    unfulfilledBids.length = 0;

    // reset all credit limits of users
    // async.series([
    // 	function(callback){
    // 		var db = require('./db');
    // 		db.connection(callback);

    // 	}],
    // 	function(connection){
    	connection.query('Truncate table credit;', function(err, docs) {
    		if(!err){
    			console.log('Credit Cleared!');
    		}
    		connection.query('Truncate table bid;', function(err, docs) {
    			if(!err){
    				console.log('Bid Cleared!');
    				connection.query('Truncate table ask;', function(err, docs) {
    					if(!err){
    						console.log('Ask Cleared!');
    					}
    						// Send to BackOffice
    						bo.sendToBackOffice(function(status){
    							if(status){
    								console.log('Successfully sent to back office!');
    							}else{
    								console.log('Soething went wrong with BackOffice operation!');
    							}
    						});
    						
    					});
    			}

    		});
    	});
    	// });

};

function addBid(bid, callback){
	var query = "Insert into bid (bidder,stock,price,time,status) value (?,?,?,?,?);";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){

		connection.query(query,[bid.username, bid.stock, bid.price, bid.date, bid.status], function(err, docs) {
			callback(docs);
		});
		// });
}

function addAsk(ask, callback){
	var query = "Insert into ask (seller,stock,price,time,status) value (?,?,?,?,?);";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
		connection.query(query,[ask.username, ask.stock, ask.price, ask.date, ask.status], function(err, docs) {
			callback(docs);
		});
		// });
}

function addMatch(match, callback){
	var query = "Insert into matched (stock, bidder, seller, amt, datetime) values (?,?,?,?,?);";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
		// }],function(connection){
			connection.query(query,[match.stock, match.highestBid.bidder, match.lowestAsk.seller, match.price,match.date], function(err, docs) {
				callback(docs);
			});
		// });
}
function updateBidMatch(bid, callback){
	var query = "Update exchange.bid set status='matched' where id = ?;";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
		connection.query(query,[bid.id], function(err, docs) {
			callback(docs);
		});
		// });
}
function updateAskMatch(ask, callback){
	var query = "Update exchange.ask set status='matched' where id = ?; ";
	// async.series([
	// 	function(callback){
	// 		var db = require('./db');
	// 		var connection = db.connection(callback);
	// 	}],function(connection){
		connection.query(query,[ask.id], function(err, docs) {
			callback(docs);
		});
		// });
}

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}

});