var config = {};

config.database = 'exchange';

// config.masterdbhost = 'localhost';
// config.masterdbport = 3306;
// config.masterlogin = 'user';
// config.masterpass = 'user';

// config.slavedbhost = 'localhost';
// config.slavedbport = 3306;
// config.slavelogin = 'user';
// config.slavepass = 'user';

config.masterdbhost = 'localhost';
config.masterdbport = 7000;
config.masterlogin = 'root';
config.masterpass = '';

config.slavedbhost = 'localhost';
config.slavedbport = 7000;
config.slavelogin = 'root';
config.slavepass = '';

// config.masterdbhost = 'localhost';
// config.masterdbport = 3306;
// config.masterlogin = 'user';
// config.masterpass = 'user';

// config.slavedbhost = 'localhost';
// config.slavedbport = 3306;
// config.slavelogin = 'user';
// config.slavepass = 'user';

config.secret = '1234567890QWERTY';

config.username ='G1T1';
config.password ='pistachio';
config.soapURLPrimary = 'http://10.0.106.239:81/aabo/Service.asmx?wsdl';
config.soapURLSecondary = 'http://10.4.12.30:81/aabo/Service.asmx?wsdl';

config.matchedLocation = './logs/matched.log';
config.rejectedLocation = './logs/rejected.log';
module.exports = config;