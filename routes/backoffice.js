var config = require('../config/config');
var soap = require('soap');
var soapURLPrimary = config.soapURLPrimary;
var soapURLSecondary = config.soapURLSecondary;
var fs = require('fs');
var filename = config.matchedLocation;

exports.sendToBackOffice = function(match,callback){

	var url = soapURLPrimary;
	if(!checkConnection(soapURLPrimary)){
		console.log('Primary BackOffice is down');
		if(checkConnection(soapURLSecondary)){
			url = soapURLSecondary;
		}else{
			console.log('Both BackOffices are down');
			return false;
		}
	}
	// var status = true;
	// require('readline').createInterface({
	// 	input: fs.createReadStream(filename),
	// 	terminal: false
	// }).on('line', function(line){
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

	// }).on('close', function(){
	// 	callback(status);
	// });
};
exports.sendToBackOfficeEnd = function(callback){

var url = soapURLPrimary;
	if(!checkConnection(soapURLPrimary)){
		console.log('Primary BackOffice is down');
		if(checkConnection(soapURLSecondary)){
			url = soapURLSecondary;
		}else{
			console.log('Both BackOffices are down');
			return false;
		}
	}
	var status = true;
	require('readline').createInterface({
		input: fs.createReadStream(filename),
		terminal: false
	}).on('line', function(line){

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
						console.log('Success: ['+ args.transactionDescription+']');
					}

				});
			}
			
		});
	}).on('close', function(){
		callback(status);
	});
};

exports.clearBackoffice = function(res,resp){
	var url = soapURLPrimary;
	if(!checkConnection(soapURLPrimary)){
		console.log('Primary BackOffice is down');
		if(checkConnection(soapURLSecondary)){
			url = soapURLSecondary;
		}else{
			console.log('Both BackOffices are down');
			return false;
		}
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
				}else{
					console.log('Clear BackOffice Log Success');
					resp.end('Success');
				}

			});
		}
	});

};

function checkConnection(url){
	soap.createClient(url, function(err, client) {
		if(err){
			return false;
		}
	});
	return true;
}