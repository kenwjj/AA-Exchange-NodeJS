var config = require('../config/config');
var soap = require('soap');
var soapURLPrimary = config.soapURLPrimary;
var soapURLSecondary = config.soapURLSecondary;
var fs = require('fs');
var filename = config.matchedLocation;

exports.sendToBackOffice = function(match,callback){

	checkConnection(soapURLPrimary,soapURLSecondary,function(url){
		if(url==='down'){
			callback(false);
		}

		var line  = "stock: " + match.stock + ", price: " + match.price + ", bidder userId: " + match.highestBid.bidder + ", seller userId: " + match.lowestAsk.seller +", date: " + match.date.toString() + "\r\n";
		var args = {teamId: config.username,teamPassword:config.password, transactionDescription:line};

	// soap.createClient('http://www.webservicex.net/country.asmx?WSDL', function(err, client) {
		soap.createClient(url, function(err, client) {
			if(err){
				console.log('Client connect error');
				console.log(err);
			}else{
				client.ProcessTransaction (args,function(err, result) {
					if(err){
						console.log(err);
						status = false;
						console.log('Failed: ['+ args.transactionDescription+']');
					}else{
						// console.log('Success: ['+ args.transactionDescription+']');
					}

				});
			}
			
		});
	});
};
exports.sendToBackOfficeEnd = function(callback){

	checkConnection(soapURLPrimary,soapURLSecondary,function(url){

		if(url==='down'){
			callback(false);
		}

		var status = true;
		var counter = 0;
		var holding = [];
		require('readline').createInterface({
			input: fs.createReadStream(filename),
			terminal: false
		}).on('line', function(line){
			counter++;
			var args = {teamId: config.username,teamPassword:config.password, transactionDescription:line};

		// soap.createClient('http://www.webservicex.net/country.asmx?WSDL', function(err, client) {
			soap.createClient(url, function(err, client) {
				if(err){
					console.log('Client connect error');
					console.log(err);
				}else{
					client.ProcessTransaction(args,function(err, result) {
						holding.push(0);
						if(err){
							console.log('Failed: ['+ args.transactionDescription+']');
							callback(false);
						}else{
							console.log(result);
							console.log('Success: ['+ args.transactionDescription+']');
							if(holding.length == counter){
								callback(true);
							}
						}

					});
				}

			});
		});
	});
};

exports.clearBackoffice = function(callback){
	checkConnection(soapURLPrimary,soapURLSecondary,function(url){

		if(url==='down'){
			callback(false);
		}

		var args = {teamId: config.username,teamPassword:config.password};
		soap.createClient(url, function(err, client) {
			if(err){
				console.log('Client connect error');
				console.log(err);
			}else{
				client.Clear (args,function(err, result) {
					if(err){
						console.log(err);
						console.log('Clear BackOffice Log Failed');
						callback(false);
					}else{
						console.log('Clear BackOffice Log Success');
						callback(true);
					}

				});
			}
		});
	});

};

function checkConnection(url1,url2,callback){
	
	soap.createClient(url1, function(err, client) {
		if(!err){
			callback(url1);
		}else{
			console.log('Primary BackOffice is down');
			soap.createClient(url2, function(err, client) {
			if(!err){
				console.log('Secondary BackOffice is up');
				callback(url2);
			}else{
				console.log('Both BackOffices are down');
				callback('down');
			}
		});	
		}
		
	});

}