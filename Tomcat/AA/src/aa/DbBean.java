/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package aa;

import java.net.ConnectException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;

import com.mysql.jdbc.PreparedStatement;
import com.mysql.jdbc.ResultSetMetaData;

/**
 * 
 * @author danisg
 */
public class DbBean {

	// change the dbURL if necessary.
	private static String dbDriver = "com.mysql.jdbc.Driver";
	protected static Connection dbConnection;
	static String dbURL = null;
	static String dbUser = null;
	static String dbPassword = null;
	private static final int DAILY_CREDIT_LIMIT_FOR_BUYERS = 1000000;
	//	static boolean primaryDatabase = true;
	//	static int failedAttempts = 0;

	//List of prepared Statement
	private static PreparedStatement pTruncateAsks;
	private static PreparedStatement pTruncateBids;
	private static PreparedStatement pTruncateCredit;
	private static PreparedStatement pAddnewAsk;
	private static PreparedStatement pAddnewBid;
	private static PreparedStatement pAddnewMatch;
	private static PreparedStatement pAddnewCredit;
	private static PreparedStatement pSelectHighestBid;
	private static PreparedStatement pSelectLowestAsk;
	private static PreparedStatement pSelectCurrentPrice;
	private static PreparedStatement pSelectHighestBidPrice;
	private static PreparedStatement pSelectLowestAskPrice;
	private static PreparedStatement pSelectUserCredit;
	private static PreparedStatement pSelectUnfulfilledBids;
	private static PreparedStatement pSelectUnfulfilledAsks;
	private static PreparedStatement pUpdateBidStatus;
	private static PreparedStatement pUpdateAskStatus;
	private static PreparedStatement pUpdateCreditLimit;
	private static PreparedStatement pCountUnfulfilledBid;
	private static PreparedStatement pCountUnfulfilledAsk;
	private static PreparedStatement pSelectAllCreditLimit;
	private static PreparedStatement pAddIndex;
	private static PreparedStatement pDeleteIndex;
	private static PreparedStatement pTruncateMatched;
	private static SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");


	// Read JDBC parameters from web.xml

	public static boolean connect() throws ClassNotFoundException, SQLException, NamingException {

		if (dbConnection == null || dbConnection.isClosed()) {

			// connects to the database using root. change your database id/password here if necessary    
			Context env = (Context) new InitialContext().lookup("java:comp/env");
			dbURL = (String) env.lookup("dbURL1");
			dbUser = (String) env.lookup("dbUser");
			dbPassword = (String) env.lookup("dbPassword");

			Class.forName(dbDriver);
			// login credentials to your MySQL server

			dbConnection = DriverManager.getConnection(dbURL, dbUser, dbPassword);
			System.out.println(dbConnection);
			return true;
		} else {
			return true;
		}

	}

	public static boolean endTradingDay(){
		//truncate all bid, ask history and credit table

		try {

			//dbConnection.setAutoCommit(false);
			pTruncateBids.setInt(1,-10);
			boolean deleteBidStatus = pTruncateBids.execute();
			pTruncateAsks.setInt(1, -10);
			boolean deleteAskStatus = pTruncateAsks.execute();
			pTruncateCredit.setInt(1,-10);
			boolean deleteCreditStatus = pTruncateCredit.execute();
			pTruncateMatched.setInt(1, -10);
			boolean deleteMatched = pTruncateMatched.execute();
			//dbConnection.commit();
			return true;
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return false;
		}
		catch(Exception e){
			e.printStackTrace();
			return false;
		}

	}

	//	public static boolean increaseDakotaTimer() {
	//		failedAttempts++;
	//
	//		if (failedAttempts >= 2) {
	//			initiateDatabaseFailover();
	//			return true;
	//		}
	//		return false; // database failover false
	//	}
	//
	//	public static void kickDakota() {
	//		if (failedAttempts != 0) {
	//			failedAttempts = 0;
	//		}
	//	}
	//	private static void initiateDatabaseFailover() {
	//		try {
	//			if (primaryDatabase) { //swap to secondary
	//				// connects to the database using root. change your database id/password here if necessary    
	//				Context env = (Context) new InitialContext().lookup("java:comp/env");
	//				dbURL = (String) env.lookup("dbURL2");
	//				dbUser = (String) env.lookup("dbUser2");
	//				dbPassword = (String) env.lookup("dbPassword2");
	//
	//				Class.forName(dbDriver);
	//				// login credentials to your MySQL server
	//				dbConnection = DriverManager.getConnection(dbURL, dbUser, dbPassword);
	//				prepareStatements();
	//
	//				primaryDatabase = false;
	//				kickDakota(); // success, reset counter
	//
	//			} else { //swap to primary
	//				// connects to the database using root. change your database id/password here if necessary    
	//				Context env = (Context) new InitialContext().lookup("java:comp/env");
	//				dbURL = (String) env.lookup("dbURL");
	//				dbUser = (String) env.lookup("dbUser");
	//				dbPassword = (String) env.lookup("dbPassword");
	//
	//				Class.forName(dbDriver);
	//				// login credentials to your MySQL server
	//				dbConnection = DriverManager.getConnection(dbURL, dbUser, dbPassword);
	//				prepareStatements();
	//
	//				primaryDatabase = true;
	//				kickDakota(); // success, reset counter
	//			}
	//
	//		} catch (Exception e) {
	//			e.printStackTrace(); // Connection failed
	//		}
	//	}

	public static boolean addNewBid(Bid nBid) throws SQLException {
		try{

			pAddnewBid.setString(1, nBid.getUserId());
			pAddnewBid.setString(2, nBid.getStock());
			pAddnewBid.setInt(3, nBid.getPrice());
			Date bidDate = nBid.getDate();
			String bidDateTime = sdf.format(bidDate);
			pAddnewBid.setString(4,bidDateTime);
			pAddnewBid.setString(5, "unfulfilled");
			boolean status = pAddnewBid.execute();
			//			kickDakota();
			//System.out.println("New Bid: " + nBid.toString() + " Status: " + status);
			return status;
		}
		catch(Exception e){
			e.printStackTrace();
		}
		return false;
	}

	public static int getCurrentPrice(String stock) throws SQLException{

		pSelectCurrentPrice.setString(1,stock);
		pSelectCurrentPrice.setString(2, stock);
		ResultSet rs = pSelectCurrentPrice.executeQuery();
		//kickDakota();
		while(rs.next()){
			try{
				return rs.getInt("amt");
			}
			catch(NullPointerException e){
				return -1;
			}
			catch(SQLException e){
				throw e;
			}
		}
		return -1;
	}

	public static boolean addNewAsk(Ask newAsk) throws SQLException{
		try{

			pAddnewAsk.setString(1, newAsk.getUserId());
			pAddnewAsk.setString(2, newAsk.getStock());
			pAddnewAsk.setInt(3, newAsk.getPrice());
			Date askDate = newAsk.getDate();
			String askDateTime = sdf.format(askDate);
			pAddnewAsk.setString(4,askDateTime);
			pAddnewAsk.setString(5, "unfulfilled");
			boolean status = pAddnewAsk.execute();
			//			kickDakota();
			return status;
		}
		catch(Exception e){
			e.printStackTrace();
		}
		return false;
	}

	public static int getCreditRemaining(String userId) throws SQLException{
		//try {
		pSelectUserCredit.setString(1,userId);
		ResultSet rs = pSelectUserCredit.executeQuery();
		//	kickDakota();
		if(rs.next()){
			try{
				return rs.getInt("credit_limit");
			}
			catch(NullPointerException e){
				System.err.println("CATCHED NULL POINTER EXCEPTION. USER: " + userId);
				return -1;
			}
		}
		else{
			//create new user and return limit
			pAddnewCredit.setString(1,userId);
			pAddnewCredit.setInt(2, DAILY_CREDIT_LIMIT_FOR_BUYERS);
			pAddnewCredit.execute();
			//kickDakota();
			return DAILY_CREDIT_LIMIT_FOR_BUYERS;
		}
	}

	public static boolean updateBidMatch(Bid b) throws SQLException{
		//	try {
		pUpdateBidStatus.setInt(1, b.getId());
		boolean status = pUpdateBidStatus.execute();
		//	kickDakota();
		return status;
	}

	public static boolean updateCreditLimit(String userId, int remainingCredit) throws SQLException{

		pUpdateCreditLimit.setInt(1,remainingCredit);
		pUpdateCreditLimit.setString(2,userId);
		boolean status = pUpdateCreditLimit.execute();
		//	kickDakota();
		return status;
	}

	public static ArrayList<Bid> retrieveUnfulfilledBids(String stock) throws SQLException{
		ArrayList<Bid> unfulfilledBid = new ArrayList<Bid>();
		try {
			pSelectUnfulfilledBids.setString(1, stock);
			ResultSet rs = pSelectUnfulfilledBids.executeQuery();
			//	kickDakota();
			ResultSetMetaData meta = (ResultSetMetaData) rs.getMetaData();
			while(rs.next()){
				String bidder = rs.getString("bidder");
				String stockSymbol = rs.getString("stock");
				int price = Integer.parseInt(rs.getString("price"));
				String dateTime = rs.getString("time");
				Date dTime = sdf.parse(dateTime);
				String aStatus = rs.getString("status");
				int id = Integer.parseInt(rs.getString("id"));
				Bid b = new Bid(stockSymbol,price,bidder,dTime,aStatus,id);
				unfulfilledBid.add(b);
			}
		} 
		catch (SQLException e) {
			//			// TODO Auto-generated catch block
			e.printStackTrace();
			return unfulfilledBid;
		} 
		catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return unfulfilledBid;
		}
		return unfulfilledBid;
	}

	public synchronized static ArrayList<Ask> retrieveUnfulfilledAsks(String stock) {
		ArrayList<Ask> unfulfilledAsk = new ArrayList<Ask>();
		try {
			pSelectUnfulfilledAsks.setString(1, stock);
			ResultSet rs = pSelectUnfulfilledAsks.executeQuery();
			//	kickDakota();
			while(rs.next()){
				String seller = rs.getString("seller");
				String stockSymbol = rs.getString("stock");
				int price = Integer.parseInt(rs.getString("price"));
				String dateTime = rs.getString("time");
				Date dTime = sdf.parse(dateTime);
				String aStatus = rs.getString("status");
				int id = Integer.parseInt(rs.getString("id"));
				Ask a = new Ask(stockSymbol,price,seller,dTime,aStatus,id);
				unfulfilledAsk.add(a);
			}
		}
		catch (SQLException e) {
			//			// TODO Auto-generated catch block
			e.printStackTrace();
			//			//increaseDakotaTimer();
			return unfulfilledAsk;
		} 
		catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return unfulfilledAsk;
		}
		return unfulfilledAsk;
	}
	
	public static int getHighestBidPrice(String stock) {
		try {
			pSelectHighestBidPrice.setString(1, stock);
			ResultSet rs =  pSelectHighestBidPrice.executeQuery();
			//	kickDakota();
			while(rs.next()){
				try{
					int r =  Integer.parseInt(rs.getString("max(price)"));
					return r;
					}
				catch(NumberFormatException ef){
					//ef.printStackTrace();
					return -1;
				}
				catch(NullPointerException e){
					return -1;
				}
				catch(SQLException e){
					return -1;
				}
			}			
		} 
		catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			return -1;
		}

		return -1;
	}

	public  static int getLowestAskPrice(String stock){
		try {
			pSelectLowestAskPrice.setString(1,stock);
			ResultSet rs = pSelectLowestAskPrice.executeQuery();
			//	kickDakota();
			while(rs.next()){
				try{
					int minPrice = Integer.parseInt(rs.getString("min(price)"));
					return minPrice;
				}
				catch(NumberFormatException e){
					//e.printStackTrace();
					return -1;
				}
				catch(NullPointerException e){
					return -1;
				}
				catch(SQLException e){
					return -1;
				}
			}
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			//increaseDakotaTimer();
			return -1;
		}

		return -1;
	}

	public  static ResultSet selectAllCredit() throws SQLException{
		ResultSet rs;
		rs = pSelectAllCreditLimit.executeQuery();
		//	kickDakota();
		return rs;
	}
	public static boolean addRejectBid(Bid b)throws SQLException{
		pAddnewBid.setString(1, b.getUserId());
		pAddnewBid.setString(2, b.getStock());
		pAddnewBid.setInt(3, b.getPrice());
		Date bidDate = b.getDate();
		String bidDateTime = sdf.format(bidDate);
		pAddnewBid.setString(4,bidDateTime);
		pAddnewBid.setString(5, "rejected");
		boolean status = pAddnewBid.execute();
		//	kickDakota();
		return status;
	}


	public static boolean addNewMatched(MatchedTransaction mt,int bid,int askid) throws SQLException{

		//String sqlAddNewMatch = "Insert into matched (stock, bidder, seller, amt, datetime) values (?,?,?,?,?)";
		//	try {
		pAddnewMatch.setString(1,mt.getStock());
		pAddnewMatch.setString(2,mt.getBuyerId());
		pAddnewMatch.setString(3,mt.getSellerId());
		pAddnewMatch.setInt(4, mt.getPrice());
		pAddnewMatch.setString(5, sdf.format(mt.getDate()));
		pAddnewMatch.setInt(6, bid);
		pAddnewMatch.setInt(7,askid);
		pAddnewMatch.execute();
		//	kickDakota();
		return true;
	}

	public static Bid getHighestBid(String stock) throws SQLException{
		try {
			pSelectHighestBid.setString(1,stock);
			ResultSet rs = pSelectHighestBid.executeQuery();
			//	kickDakota();
			while(rs.next()){
				String bidder = rs.getString("bidder");
				String stockSymbol = rs.getString("stock");
				int price = rs.getInt("price");
				String dateTime = rs.getString("time");
				Date dTime = sdf.parse(dateTime);
				String aStatus = rs.getString("status");
				int id = Integer.parseInt(rs.getString("id"));
				Bid b = new Bid(stockSymbol,price,bidder,dTime,aStatus,id);
				return b;
			}

		}  
		catch (ParseException e) {
			//			// TODO Auto-generated catch block
			e.printStackTrace();
			return null;
		}
		catch(NullPointerException nfe){
			System.err.println("Highest bid NULL POINTER EXCEPTION CATCHED");
			return null;
		}
		return null;
	}

	public static  Ask getLowestAsk(String stock) throws SQLException{

		try {
			pSelectLowestAsk.setString(1,stock);
			ResultSet rs = pSelectLowestAsk.executeQuery();
			//	kickDakota();
			while(rs.next()){
				String seller = rs.getString("seller");
				String stockSymbol = rs.getString("stock");
				int price = Integer.parseInt(rs.getString("price"));
				String dateTime = rs.getString("time");
				Date dTime = sdf.parse(dateTime);
				String aStatus = rs.getString("status");
				int id = Integer.parseInt(rs.getString("id"));
				Ask a = new Ask(stockSymbol,price,seller,dTime,aStatus,id);
				return a;
			}

		}
		catch (ParseException e) {
			//			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return null;
	}

	public static boolean updateAskMatch(Ask a) throws SQLException{
		pUpdateAskStatus.setInt(1,a.getId());
		boolean status = pUpdateAskStatus.execute();
		//kickDakota();
		return status;
	}

	public static int countUnfulfilledBid(String stock) throws SQLException{
		pCountUnfulfilledBid.setString(1, stock);
		ResultSet rs = pCountUnfulfilledBid.executeQuery();
		//kickDakota();
		while(rs.next()){
			return rs.getInt("unfulfilledCount");
		}

		return -1;
	}

	public static int countUnfulfilledAsk(String stock) throws SQLException{
		pCountUnfulfilledAsk.setString(1, stock);
		ResultSet rs = pCountUnfulfilledAsk.executeQuery();
		//kickDakota();
		while(rs.next()){

			return rs.getInt("unfulfilledCount");


		}
		return -1;
	}


	public static void prepareStatements(){
		try{
			boolean dbStatus = connect();
			//delete statements
			String sqlDeleteAllBids = "set sql_safe_updates = 0; delete from bid where price >= ?";
			pTruncateBids = (PreparedStatement) dbConnection.prepareStatement(sqlDeleteAllBids);
			String sqlDeleteAllAsks = "set sql_safe_updates = 0; delete from ask where price >= ?";
			pTruncateAsks = (PreparedStatement) dbConnection.prepareStatement(sqlDeleteAllAsks);
			String sqlDeleteAllCredits = "set sql_safe_updates = 0; delete from credit where credit_limit >= ?";
			pTruncateCredit = (PreparedStatement) dbConnection.prepareStatement(sqlDeleteAllCredits);

			//Add
			String sqlAddNewAsk = "Insert into ask (seller,stock,price,time,status) value (?,?,?,?,?)";
			pAddnewAsk = (PreparedStatement) dbConnection.prepareStatement(sqlAddNewAsk);
			String sqlAddNewBid = "Insert into bid (bidder,stock,price,time,status) value (?,?,?,?,?)";
			pAddnewBid = (PreparedStatement) dbConnection.prepareStatement(sqlAddNewBid);
			String sqlAddNewMatch = "Insert into matched (stock, bidder, seller, amt, datetime,bidid,askid) values (?,?,?,?,?,?,?)";
			pAddnewMatch = (PreparedStatement)dbConnection.prepareStatement(sqlAddNewMatch);
			String sqlAddNewCredit = "Insert into credit (userid, credit_limit) values (?,?)";
			pAddnewCredit = (PreparedStatement)dbConnection.prepareStatement(sqlAddNewCredit);

			String sqlGetMinAsk = "SELECT seller,stock,price,time,status,id from ask where stock = ? and status = 'unfulfilled' order by price asc, time asc limit 1 for update";
			pSelectLowestAsk = (PreparedStatement)dbConnection.prepareStatement(sqlGetMinAsk);
			String sqlGetMaxBid = "Select bidder,stock,price,time,status,id from bid where stock = ? and status = 'unfulfilled' order by price desc, time asc limit 1 for update";
			pSelectHighestBid = (PreparedStatement)dbConnection.prepareStatement(sqlGetMaxBid);
			String sqlSelectHighestBidP = "select max(price) from bid where stock = ? and status = 'unfulfilled' ";
			pSelectHighestBidPrice = (PreparedStatement)dbConnection.prepareStatement(sqlSelectHighestBidP);
			String sqlSelectLowestAskP = "select min(price) from ask where stock = ? and status = 'unfulfilled'";
			pSelectLowestAskPrice = (PreparedStatement)dbConnection.prepareStatement(sqlSelectLowestAskP);

			String sqlSelectUserCredit = "select credit_limit from credit where userid = ? ";
			pSelectUserCredit = (PreparedStatement) dbConnection.prepareStatement(sqlSelectUserCredit);
			String sqlUpdateCreditLimit = "Update exchange.credit set credit_limit = ? where userid = ?";
			pUpdateCreditLimit = (PreparedStatement) dbConnection.prepareStatement(sqlUpdateCreditLimit);
			String sqlUpdateBidStatus = "Update exchange.bid set status='matched' where id = ? ";
			pUpdateBidStatus =  (PreparedStatement) dbConnection.prepareStatement(sqlUpdateBidStatus);
			String sqlUpdateAskStatus =  "Update exchange.ask set status='matched' where id = ? ";
			pUpdateAskStatus=(PreparedStatement) dbConnection.prepareStatement(sqlUpdateAskStatus);

			String sqlCountUnfulfilledBid = "Select Count(*) as unfulfilledCount from bid where status = 'unfulfilled' and stock = ?";
			pCountUnfulfilledBid = (PreparedStatement) dbConnection.prepareStatement(sqlCountUnfulfilledBid);
			String sqlCountUnfulfilledAsk = "Select Count(*) as unfulfilledCount from ask where status = 'unfulfilled' and stock = ?";
			pCountUnfulfilledAsk = (PreparedStatement) dbConnection.prepareStatement(sqlCountUnfulfilledAsk);

			String sqlSelectUnfulfilledBids = "Select bidder,stock,price,time,status,id from exchange.bid where stock = ? and status = 'unfulfilled'";
			pSelectUnfulfilledBids =(PreparedStatement) dbConnection.prepareStatement(sqlSelectUnfulfilledBids); 

			String sqlSelectUnfulfilledAsks = "Select seller,stock,price,time,status,id from exchange.ask where stock = ? and status = 'unfulfilled'";
			pSelectUnfulfilledAsks =(PreparedStatement) dbConnection.prepareStatement(sqlSelectUnfulfilledAsks); 

			String sqlSelectCurrentPrice = "select amt from matched where stock = ? and datetime = (select max(datetime) from matched where stock = ?)";
			pSelectCurrentPrice = (PreparedStatement) dbConnection.prepareStatement(sqlSelectCurrentPrice); 
			String sqlSelectAllCreditLimit = "select * from credit";
			pSelectAllCreditLimit = (PreparedStatement) dbConnection.prepareStatement(sqlSelectAllCreditLimit); 

			String sqlDeleteMatched = "set sql_safe_updates = 0; delete from matched where amt >= ?";
			pTruncateMatched = (PreparedStatement) dbConnection.prepareStatement(sqlDeleteMatched); 
		}
		catch(SQLException sqle){
			sqle.printStackTrace();
		}
		catch(ClassNotFoundException e){
			e.printStackTrace();
		}
		catch(NamingException ne){
			ne.printStackTrace();
		}
	}

	private static void prepareIndexStatement(){

		try {
			connect();
			String cCreateIndex = "call create_index_if_not_exists(?,?)";
			pAddIndex = (PreparedStatement)dbConnection.prepareStatement(cCreateIndex);
			String cDeleteIndex = "call drop_index_if_exists(?,?)";
			pDeleteIndex = (PreparedStatement)dbConnection.prepareStatement(cDeleteIndex);
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (NamingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	public static void addIndex(){

		try {
			prepareIndexStatement();
			pAddIndex.setString(1,"ask");
			pAddIndex.setString(2,"price");
			pAddIndex.execute();

			pAddIndex.setString(1,"ask");
			pAddIndex.setString(2,"stock");
			pAddIndex.execute();

			pAddIndex.setString(1,"ask");
			pAddIndex.setString(2,"status");
			pAddIndex.execute();

			pAddIndex.setString(1,"bid");
			pAddIndex.setString(2,"price");
			pAddIndex.execute();

			pAddIndex.setString(1,"bid");
			pAddIndex.setString(2,"stock");
			pAddIndex.execute();

			pAddIndex.setString(1,"bid");
			pAddIndex.setString(2,"status");
			pAddIndex.execute();

			pAddIndex.setString(1, "credit");
			pAddIndex.setString(2,"userid");
			pAddIndex.execute();

			pAddIndex.setString(1,"matched");
			pAddIndex.setString(2,"stock");
			pAddIndex.execute();

			pAddIndex.setString(1,"matched");
			pAddIndex.setString(2,"datetime");
			pAddIndex.execute();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	public static void deleteIndex(){
		try{
			prepareIndexStatement();
			pDeleteIndex.setString(1,"ask");
			pDeleteIndex.setString(2,"stock");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"ask");
			pDeleteIndex.setString(2,"status");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"ask");
			pDeleteIndex.setString(2,"price");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"bid");
			pDeleteIndex.setString(2,"stock");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"bid");
			pDeleteIndex.setString(2,"status");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"bid");
			pDeleteIndex.setString(2,"price");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"credit");
			pDeleteIndex.setString(2,"userid");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"matched");
			pDeleteIndex.setString(2,"stock");
			pDeleteIndex.execute();

			pDeleteIndex.setString(1,"matched");
			pDeleteIndex.setString(2,"datetime");
			pDeleteIndex.execute();
		}
		catch(SQLException e){
			e.printStackTrace();
		}

	}


	public static void close() throws SQLException {
		if (dbConnection != null && !dbConnection.isClosed()) {
			dbConnection.close();
		}
	}
}
