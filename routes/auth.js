// Define authentication middleware BEFORE your routes
module.exports = function (req, res, next) {
  // your validation code goes here. 
  var isAuthenticated = true;
  if (req.session.username===undefined) {
  	// next();
res.render('login');
  }
  else if(req.session.username.length > 0 ) {
  	next();
  }else{
  	res.render('login');
  }
}