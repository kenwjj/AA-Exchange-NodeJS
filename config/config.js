var config = {};

config.mode = 'actual'; // local or actual
config.clustering = false; // true or false
config.database = 'exchange';

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
	config.masterdbhost = 'localhost';
	config.masterdbport = 7000;
	config.masterlogin = 'root';
	config.masterpass = '';

	config.slavedbhost = 'localhost';
	config.slavedbport = 7000;
	config.slavelogin = 'root';
	config.slavepass = '';

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

config.secret = '1234567890QWERTY';

config.username ='G1T1';
config.password ='pistachio';
config.soapURLPrimary = 'http://10.0.106.239:81/aabo/Service.asmx?wsdl';
config.soapURLSecondary = 'http://10.4.12.30:81/aabo/Service.asmx?wsdl';

config.matchedLocation = './logs/matched.log';
config.rejectedLocation = './logs/rejected.log';

if(config.mode ==='local'){
	config.hosts = ['localhost'];
}else{
	config.hosts = ['192.168.0.5'];
}
module.exports = config;