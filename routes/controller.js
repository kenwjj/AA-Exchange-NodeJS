var async = require('async');
var fs = require('fs');
var soap = require('soap');

var creditLimit = 9999999;
var unfulfilledBids = [];
var unfulfilledAsks = [];
var matchedTransactions = [];
var latestSmuPrice = -1, latestNtuPrice = -1, latestNusPrice = -1;
var matchedLocation = "../logs/matched.log";
var rejectedLocation = "../logs/rejected.log";


exports.placeNewBidAndAttemptMatch = function(bid,callback){
	// var okToContinue;
	//check limit set to db

	async.series([
		function(callback){
			validateCreditLimit(bid, callback);

		}],
		function(okToContinue){

			var status;
			if (!okToContinue) {
				status = false;
			}

	// add to unfulfilled bids

	unfulfilledBids.push(bid);
	// check amt of stocks in the ask list
	var count = 0;
	for (var i = 0; i < unfulfilledAsks.length; i++) {
		if (unfulfilledAsks[i].stock === bid.stock) {
			count++;
		}
	}

	// not in list just return no matches
	if (count === 0) {
		status = true;
	}

	// given a particular stock find the highest bid price
	var highestBid = getHighestBid(bid.stock),

	// given the stock find the lowest ask price
	lowestAsk = getLowestAsk(bid.stock);


	if (typeof lowestAsk !== 'undefined' && typeof highestBid !== 'undefined' && highestBid.price >= lowestAsk.price) {
		var bidIndex = unfulfilledBids.indexOf(highestBid),
		askIndex = unfulfilledAsks.indexOf(lowestAsk);

		unfulfilledBids.splice(bidIndex, 1);
		unfulfilledAsks.splice(askIndex, 1);

		var match = {
			highestBid: highestBid,
			lowestAsk: lowestAsk,
			date: lowestAsk.date,
			price: highestBid.price,
			stock: highestBid.stock
		};
		matchedTransactions.push(match);
		updateLatestPrice(match);
		logMatchedTransactions();
	}

	status = true;
	callback(status);
});


};
exports.placeNewAskAndAttemptMatch = function(ask,callback) {

	async.series([
		function(callback){
			validateCreditLimit(ask, callback);
		}],function(okToContinue){
			var status;
			if (!okToContinue) {
				status = false;
			}
			unfulfilledAsks.push(ask);

			var count = 0;
			for (var i = 0; i < unfulfilledBids.length; i++) {
				if (unfulfilledBids[i].stock === ask.stock) {
					count++;
				}
			}
			if (count === 0) {
				status = true;
			}

			var highestBid = getHighestBid(ask.stock),
			lowestAsk = getLowestAsk(ask.stock);
			if (typeof lowestAsk !== 'undefined' && typeof highestBid !== 'undefined' && lowestAsk.price <= highestBid.price) {
				var bidIndex = unfulfilledBids.indexOf(highestBid),
				askIndex = unfulfilledAsks.indexOf(lowestAsk);

				unfulfilledBids.splice(bidIndex, 1);
				unfulfilledAsks.splice(askIndex, 1);

				var match = {
					highestBid: highestBid,
					lowestAsk: lowestAsk,
					date: lowestAsk.date,
					price: highestBid.price,
					stock: highestBid.stock
				};
				matchedTransactions.push(match);
				updateLatestPrice(match);
				logMatchedTransactions();
			}
			status = true;
			callback(status);
		});
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

exports.getLatestPrice = function(stock) {
	if (stock === "smu") {
		return latestSmuPrice;
	} else if (stock === "nus") {
		return latestNusPrice;
	} else if (stock === "ntu") {
		return latestNtuPrice;
	}
	return -1;
};

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
function getHighestBid(stock) {
	var highestBid = {
		price: 0
	};
	for (var i = 0; i < unfulfilledBids.length; i++) {
		var bid = unfulfilledBids[i];
		if (bid.stock === stock && bid.price >= highestBid.price) {
			if (bid.price === highestBid.price) {
				if (bid.date.getTime() < highestBid.date.getTime()) {
					highestBid = bid;
				}
			} else {
				highestBid = bid;
			}
		}
	}
	if (typeof highestBid.userId === 'undefined') {
		return;
	}
	return highestBid;
}
// returns the lowest ask for a particular stock
// returns -1 if there is no ask at all
function getLowestAsk(stock) {
	var lowestAsk = {
		price: 999999
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
}


// Logging
function logRejectedBuyOrder(bid) {
	var bidString = "stock: " + bid.stock + ", price: " + bid.price + ", userId: " + id.userId + ", date: " + bid.date.toString() + "\n";
	fs.appendFile(rejectedLocation, bidString, function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("Reject recorded!");
		}
	}); 
}
function logMatchedTransactions() {
	var matchString = "",
	matchLength = matchedTransactions.length;
	while (matchLength--) {
		var match = matchedTransactions.shift();
		matchString += "stock: " + match.stock + ", price: " + match.price + ", userId: " + match.userId + ", date: " + match.date.toString() + "\n";
	}
	fs.appendFile(matchedLocation, matchString, function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("Match recorded!");
		}
	}); 
}

// DB Functions
function getCreditRemaining(username,callback) {
	async.series([
		function(callback){
			var db = require('./db');
			db.connection(callback);

		}],
		function(connection){
			
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
	});
		});
}
function setCreditRemaining (username,credit_limit) {
	

	async.series([
		function(callback){
			var db = require('./db');
			db.connection(callback);

		}],
		function(connection){
			
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
		});
}

function insertCreditRemaining (username,credit_limit) {
	
	async.series([
		function(callback){
			var db = require('./db');
			db.connection(callback);

		}],
		function(connection){
			
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
		});
}

exports.getHighestBidPrice = function(stock) {
	var highestBid = getHighestBid(stock);
	if (typeof highestBid === 'undefined') {
		return -1;
	} else {
		return highestBid.price;
	}
};

exports.getLowestAskPrice = function(stock) {
	var lowestAsk = getLowestAsk(stock);
	if (typeof lowestAsk === 'undefined') {
		return -1;
	} else {
		return lowestAsk.price;
	}
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
exports.getUnfulfilledBids= function(stock) {
	var bidList = [];
	for (var i = 0; i < unfulfilledBids.length; i++) {
		var bid = unfulfilledBids[i];
		if (bid.stock === stock) {
console.log(bid);
			bidList.push(bid);
		}
		// pass obj back let ejs handle display
		// if (bid.stock === stock) {
		// 	returnString += "stock: " + bid.stock + ", price: " + bid.price + ", userId: " + bid.userId + ", date: " + bid.date.toString() + "<br />";
		// }
	}
	return bidList;
};
exports.getUnfulfilledAsks= function(stock) {
	
	var askList = [];
	for (var i = 0; i < unfulfilledAsks.length; i++) {
		var ask = unfulfilledAsks[i];
		if (ask.stock === stock) {
		console.log(ask);
			askList.push(ask)
		}
		// pass obj back let ejs handle display
		// if (ask.stock === stock) {
		// 	returnString += "stock: " + ask.stock + ", price: " + ask.price + ", userId: " + ask.userId + ", date: " + ask.date.toString() + "<br />";
		// }
	}
	return askList;
};

exports.getAllCreditRemainingForDisplay = function (callback){
	// get the credit limit for all users from database. #SD#
	async.series([
		function(callback){
			var db = require('./db');
			var connection = db.connection(callback);
		}],function(connection){
			var returnString = '';
			connection.query('select * from credit', function(err, docs) {
				// console.log(docs);
				// for(var i =0; i < docs.length; i++){

				// returnString += "<tr><td>" + docs[i].userid + "</td><td>"+ docs[i].credit_limit + "</td></tr>";
				// }
				callback(docs);
		// return docs;
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

    // reset all credit limits of users
    async.series([
    	function(callback){
    		var db = require('./db');
    		db.connection(callback);

    	}],
    	function(connection){

    		connection.query('DELETE FROM credit;', function(err, docs) {
    			if(!err){
    				console.log('Credit Cleared!');
    			}

    		});
    	});
    
}


/*
 var soap = require('soap');
  var url = 'http://example.com/wsdl?wsdl';
  var args = {name: 'value'};
  soap.createClient(url, function(err, client) {
      client.MyFunction(args, function(err, result) {
          console.log(result);
      });
  });
*/

function isEmptyObject(obj) {
	return !Object.keys(obj).length;
}