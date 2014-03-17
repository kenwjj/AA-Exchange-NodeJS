var config = require('../config/config');
var soap = require('soap');
var soapURLPrimary = config.soapURLPrimary;
var soapURLSecondary = config.soapURLSecondary;
var fs = require('fs');
var filename = config.matchedLocation;

exports.sendToBackOffice = function(callback){

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

	require('readline').createInterface({
		input: fs.createReadStream(filename),
		terminal: false
	}).on('line', function(line){
		console.log('Line: ' + line);
		var args = {teamId: config.username,teamPassword:config.password, transactionDescription:line};

	// soap.createClient('http://www.webservicex.net/country.asmx?WSDL', function(err, client) {
		soap.createClient(url, function(err, client) {
			if(err){
				console.log('Client connect error');
				console.log(err);
				callback(false);
			}else{
				client.ProcessTransaction (args,function(err, result) {
					if(err){
						console.log(err);
					callback(false);
					}else{
						console.log(result);
					}

				});
			}
			
		});

	});
	callback(true);
};

function checkConnection(url){
	soap.createClient(url, function(err, client) {
		if(err){
			return false;
		}
	});
	return true;
}