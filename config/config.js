var config = {};

config.mode = 'actual'; // local or actual
config.clustering = true; // true or false
config.database = 'exchange'; // database name
config.syncmatch = false; //match log syncing options
config.sendtobackoffice = false; // backoffice sending options
config.creditlimit = 1000000;
config.listenport = 8081;

if(config.mode ==='local'){
	config.masterdbhost = 'localhost';
	config.masterdbport = 3306;
	config.masterlogin = 'user';
	config.masterpass = 'user';

	config.slavedbhost = 'localhost';
	config.slavedbport = 3306;
	config.slavelogin = 'user';
	config.slavepass = 'user';

	config.sessionOptions = {
		pool: true,
		config: {
			user: 'user',
			password: 'user',
			database: 'exchange'
		}
	};
}else{
	config.masterdbhost = 'localhost';	// primary db host
	config.masterdbport = 7000;			// primary db port
	config.masterlogin = 'root';		// primary db user
	config.masterpass = '';				// primary db pass

	config.slavedbhost = '192.168.0.2';	// secondary db host
	config.slavedbport = 7000;			// secondary db port
	config.slavelogin = 'temp';			// secondary db user
	config.slavepass = '';			// secondary db pass

	// Only used in mysqlSessions mode
	config.sessionOptions = {
		pool: true,
		config: {
			user: 'root',
			password: '',
			database: 'exchange',
			port: 7000
		}
	};
}

config.secret = '1234567890QWERTY';		// Cookie Secret

config.username ='G1T1';				// Backoffice username
config.password ='pistachio';			// Backoffice pass
config.soapURLPrimary = 'http://10.0.106.239:81/aabo/Service.asmx?wsdl';
config.soapURLSecondary = 'http://10.4.12.30:81/aabo/Service.asmx?wsdl';

config.matchedLocation = './logs/matched.log';		// Match file location
config.rejectedLocation = './logs/rejected.log';	// Reject file location

if(config.mode ==='local'){
	config.hosts = ['localhost'];		
}else{
	config.hosts = ['192.168.0.2'];// File sync hosts used only if sync match is active
}
module.exports = config;