var controller = require('./controller');
var bo = require('./backoffice');
var async = require('async');

exports.index = function(req, res){
	res.render('index');
};

exports.login = function(req, res){
	res.render('login');
};
exports.logout = function(req, res){
	// req.session.destroy();
	req.session = null;
	res.render('logout');
};

exports.processlogin = function(req, res){
	req.session.username = req.body.id;
	res.render('loginSuccess',{session: req.session});

};

exports.buy = function(req, res){
	res.render('buy',{session:req.session});
};

exports.processbuy = function(req, res){
	
	var username = req.session.username;
	var stock = req.body.stock;
	var tempBidPrice = parseFloat(req.body.bidprice);
	var date = new Date();
	var bidPrice = tempBidPrice;
	bid = {
		stock: stock,
		price: bidPrice,
		username: username,
		date:date
	};
	async.series([
		function(callback){
			controller.placeNewBidAndAttemptMatch(bid,callback);
		}],function(status){
			if(status){
				res.render('buypass',{session:req.session,stock:stock,bidPrice:bidPrice});

			}else{
				res.render('buyfail',{session:req.session,stock:stock,bidPrice:bidPrice});
			}

		});	
};
exports.processsell = function(req, res){
	var username = req.session.username;
	var stock = req.body.stock;
	var tempAskPrice = req.body.askprice;
	var askPrice = parseFloat(tempAskPrice);
	var ask = {
		stock:stock,
		price:askPrice,
		username: username,
		date: new Date()
	};
		// submit the sell request
		async.series([
			function(callback){

				controller.placeNewAskAndAttemptMatch(ask,callback);
			}],function(status){
				res.render('sellsuccess',{session:req.session,stock:stock,askPrice:askPrice});
			});	
	};
	exports.sell = function(req, res){
		res.render('sell',{session:req.session});
	};
	exports.current = function(req, res){
		var smu = [];
		var nus = [];
		var ntu = [];
		//smu
		controller.getLatestPrice('smu',function(smuGetLatestPrice){
			smu.getLatestPrice = smuGetLatestPrice;
			controller.getHighestBidPrice('smu',function(smuGetHighestBidPrice){
				smu.getHighestBidPrice = smuGetHighestBidPrice;
				controller.getLowestAskPrice('smu',function(smuGetLowestAskPrice){
					smu.getLowestAskPrice = smuGetLowestAskPrice;
					//nus
					controller.getLatestPrice('nus',function(nusGetLatestPrice){
						nus.getLatestPrice = nusGetLatestPrice;
						controller.getHighestBidPrice('nus',function(nusGetHighestBidPrice){
							nus.getHighestBidPrice = nusGetHighestBidPrice;
							controller.getLowestAskPrice('nus',function(nusGetLowestAskPrice){
								nus.getLowestAskPrice = nusGetLowestAskPrice;
								//ntu
								controller.getLatestPrice('ntu',function(ntuGetLatestPrice){
									ntu.getLatestPrice = ntuGetLatestPrice;
									controller.getHighestBidPrice('ntu',function(ntuGetHighestBidPrice){
										ntu.getHighestBidPrice = ntuGetHighestBidPrice;
										controller.getLowestAskPrice('ntu',function(ntuGetLowestAskPrice){
											ntu.getLowestAskPrice = ntuGetLowestAskPrice;
											// console.log({smu:smu,nus:nus,ntu:ntu});
											// console.log(smu.getLatestPrice);
											res.render('current',{smu:smu,nus:nus,ntu:ntu});
										});
									});
								});
							});
						});
					});
				});
});
});

};
exports.view = function(req, res){
	controller.getAllCreditRemainingForDisplay(function(getAllCreditRemainingForDisplay){

		var smuBids = {};
		smuBids.getUnfulfilledBids = [];
		var smuAsks = {};
		smuAsks.getUnfulfilledAsks = [];
		var nusBids = {};
		nusBids.getUnfulfilledBids = [];
		var nusAsks = {};
		nusAsks.getUnfulfilledAsks = [];
		var ntuBids = {};
		ntuBids.getUnfulfilledBids = [];
		var ntuAsks = {};
		ntuAsks.getUnfulfilledAsks = [];

		controller.getUnfulfilledBidsAll(function(docs1){
			for(var i = 0; i < docs1.length;i++){
				if(docs1[i].stock ==='smu'){
					smuBids.getUnfulfilledBids.push(docs1[i]);
				}else if(docs1[i].stock ==='nus'){
					nusBids.getUnfulfilledBids.push(docs1[i]);
				}else if(docs1[i].stock ==='ntu'){
					ntuBids.getUnfulfilledBids.push(docs1[i]);
				}
			}
			controller.getUnfulfilledAsksAll(function(docs2){
				for(var i = 0; i < docs2.length;i++){
					if(docs2[i].stock ==='smu'){
						smuAsks.getUnfulfilledAsks.push(docs2[i]);
					}else if(docs2[i].stock ==='nus'){
						nusAsks.getUnfulfilledAsks.push(docs2[i]);
					}else if(docs2[i].stock ==='ntu'){
						ntuAsks.getUnfulfilledAsks.push(docs2[i]);
					}
				}
				res.render('viewOrders',{smuBids:smuBids,smuAsks:smuAsks,nusBids:nusBids,nusAsks:nusAsks,ntuBids:ntuBids,ntuAsks:ntuAsks,getAllCreditRemainingForDisplay:getAllCreditRemainingForDisplay});
			});
		});
	});
};
exports.end = function(req, res){

	controller.endTradingDay();
	// req.session.destroy();
	res.render('endTradingDay');
};
exports.clear = function(req, res){
	bo.clearBackoffice(function(status){
		if(status){
			res.end('Success');
		}else{
			res.end('Failure');
		}
	});
};

exports.matchlog = function(req, res){
	var match = req.query.match;
	controller.logMatchedTransactions(match,'rep');
	res.json({ status: 'true' });
};

exports.batchsend = function(req,res){
	var config = require('../config/config');
	bo.clearBackoffice(function(status){
		if(status && config.sendtobackoffice){
			// Send to BackOffice
			bo.sendToBackOfficeEnd(function(check){
				if(check){
					res.end('Successfully sent to back office!');
				}else{
					res.end('Something went wrong with BackOffice operation!');
				}
			});
		}
	});
};

exports.appendLocalsToUseInViews = function(req, res, next){

	res.locals.request = req;
   // put username in all views
   if(req.session !== null && req.session.username !== null){
   	res.locals.username = req.session.username;
   }
   next(null, req, res);
};