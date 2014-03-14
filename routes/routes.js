var controller = require('./controller');
var async = require('async');

exports.index = function(req, res){
	res.render('index');
};

exports.login = function(req, res){
	res.render('login');
};
exports.logout = function(req, res){
	req.session.destroy();
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
	var bid = {
		stock:stock,
		price:askPrice,
		username: username,
		date: new Date()
	};
		// submit the sell request
		async.series([
			function(callback){

				controller.placeNewAskAndAttemptMatch(bid,callback);
			}],function(status){
				res.render('sellsuccess',{session:req.session,stock:stock,askPrice:askPrice});
			});	
	};
	exports.sell = function(req, res){
		res.render('sell',{session:req.session});
	};
	exports.current = function(req, res){
		var smu = [];
		smu.getLatestPrice = controller.getLatestPrice('smu');
		smu.getHighestBidPrice = controller.getHighestBidPrice('smu');
		smu.getLowestAskPrice = controller.getLowestAskPrice('smu');
		var nus = [];
		nus.getLatestPrice = controller.getLatestPrice('nus');
		nus.getHighestBidPrice = controller.getHighestBidPrice('nus');
		nus.getLowestAskPrice = controller.getLowestAskPrice('nus');
		var ntu = [];
		ntu.getLatestPrice = controller.getLatestPrice('ntu');
		ntu.getHighestBidPrice = controller.getHighestBidPrice('ntu');
		ntu.getLowestAskPrice = controller.getLowestAskPrice('ntu');
		// console.log({smu:smu,nus:nus,ntu:ntu});
		// console.log(smu.getLatestPrice);
		res.render('current',{smu:smu,nus:nus,ntu:ntu});
	};
	exports.view = function(req, res){
		async.series([
			function(callback){
				controller.getAllCreditRemainingForDisplay(callback);
			}],function(getAllCreditRemainingForDisplay){
				
				var smu = [];
				smu.getUnfulfilledBids = controller.getUnfulfilledBids('smu');
				smu.getUnfulfilledAsks = controller.getUnfulfilledAsks('smu');

				var nus = [];
				nus.getUnfulfilledBids = controller.getUnfulfilledBids('nus');
				nus.getUnfulfilledAsks = controller.getUnfulfilledAsks('nus');

				var ntu = [];
				ntu.getUnfulfilledBids = controller.getUnfulfilledBids('ntu');
				ntu.getUnfulfilledAsks = controller.getUnfulfilledAsks('ntu');

				res.render('viewOrders',{smu:smu,nus:nus,ntu:ntu,getAllCreditRemainingForDisplay:getAllCreditRemainingForDisplay});
			});		
	};

	exports.end = function(req, res){

		controller.endTradingDay();
		req.session.destroy();
		res.render('endTradingDay');
	};

	exports.appendLocalsToUseInViews = function(req, res, next){

   res.locals.request = req;
   // put username in all views
   if(req.session !== null && req.session.username !== null){
   	res.locals.username = req.session.username;
   }
   next(null, req, res);
};