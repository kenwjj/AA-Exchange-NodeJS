package aa;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

import helper.PropLoader;




import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;

import webservice.ServiceSoap;
import webservice.ServiceSoapProxy;

public class ExchangeBean {

	private PropLoader prop = new PropLoader();
	private final String username = PropLoader.getProperty("username");
	private final String password = PropLoader.getProperty("password");
	// location of log files - change if necessary
	private final String MATCH_LOG_FILE = "c:\\temp\\matched.log";
	private final static String REJECTED_BUY_ORDERS_LOG_FILE = "c:\\temp\\rejected.log";

	// used to calculate remaining credit available for buyers
	private final int DAILY_CREDIT_LIMIT_FOR_BUYERS = 1000000;

	// used for keeping track of unfulfilled asks and bids in the system.
	// once asks or bids are matched, they must be removed from these
	// arraylists.
	private ArrayList<Ask> unfulfilledAsks = new ArrayList<Ask>();
	private ArrayList<Bid> unfulfilledBids = new ArrayList<Bid>();

	// used to keep track of all matched transactions (asks/bids) in the system
	// matchedTransactions is cleaned once the records are written to the log
	// file successfully
	private ArrayList<MatchedTransaction> matchedTransactions = new ArrayList<MatchedTransaction>();


	// keeps track of the latest price for each of the 3 stocks
	private static int latestPriceForSmu = -1;
	private static int latestPriceForNus = -1;
	private static int latestPriceForNtu = -1;
	private Timer timer = new Timer();
	private TimerTask backOfficeCheck = new BackOfficeConnection();


	public ExchangeBean(){
		try{
			timer.scheduleAtFixedRate(backOfficeCheck, 0, 1000);
			DbBean.prepareStatements();
		}
		catch(Exception e){
			e.printStackTrace();
		}
	}

	// keeps track of the remaining credit limits of each buyer. This should be
	// checked every time a buy order is submitted. Buy orders that breach the
	// credit limit should be rejected and logged
	// The key for this Hashtable is the user ID of the buyer, and the
	// corresponding value is the REMAINING credit limit
	// the remaining credit limit should not go below 0 under any circumstance!
	// --- Credit is now stored in database. ----
	// private Hashtable <String, Integer> creditRemaining = new
	// Hashtable<String, Integer>();



	// this method is called once at the end of each trading day. It can be
	// called manually, or by a timed daemon
	// this is a good chance to "clean up" everything to get ready for the next
	// trading day
	public void endTradingDay() throws Exception {
		DbBean.endTradingDay();
	}

	// returns a String of unfulfilled bids for a particular stock
	// returns an empty string if no such bid
	// bids are separated by <br> for display on HTML page
	public synchronized String getUnfulfilledBidsForDisplay(String stock) {
		String returnString = "";
		try{
		unfulfilledBids = DbBean.retrieveUnfulfilledBids(stock);
		for (int i = 0; i < unfulfilledBids.size(); i++) {
			Bid bid = unfulfilledBids.get(i);
			returnString += bid.toString() + "<br />";

		}
		}
		catch(SQLException s){
			return "";
		}
		return returnString;
	}

	// returns a String of unfulfilled asks for a particular stock
	// returns an empty string if no such ask
	// asks are separated by <br> for display on HTML page

	public boolean sendToBackOffice(String txnDescription) {

		ServiceSoapProxy service = new ServiceSoapProxy();
		boolean status = false;
		System.out.println(username);
		System.out.println(password);
		try {
			// create new instances of remote Service objects
			ServiceSoap port = service.getServiceSoap();

			// invoke the remote method by calling port.processTransaction().
			// processTransaction() will return false if the teamID &/or
			// password is wrong
			// it will return true if the web service is correctly called
			status = port
					.processTransaction(username, password, txnDescription);
			return status;
		} catch (Exception ex) {
			// may come here if a time out or any other exception occurs
			// what should you do here??
		}
		return false; // failure due to exception
	}

	public synchronized String getUnfulfilledAsks(String stock) throws SQLException {
		String returnString = "";
		unfulfilledAsks = DbBean.retrieveUnfulfilledAsks(stock);
		for (int i = 0; i < unfulfilledAsks.size(); i++) {
			Ask ask = unfulfilledAsks.get(i);
			if (ask.getStock().equals(stock)) {
				returnString += ask.toString() + "<br />";
			}
		}
		return returnString;
	}

	// returns the highest bid for a particular stock
	// returns -1 if there is no bid at all
	public int getHighestBidPrice(String stock) throws SQLException {
		return DbBean.getHighestBidPrice(stock);
	}

	// retrieve unfulfiled current (highest) bid for a particular stock
	// returns null if there is no unfulfiled bid for this stock
	private  Bid getHighestBid(String stock) throws SQLException {
		return DbBean.getHighestBid(stock);
	}

	// returns the lowest ask for a particular stock
	// returns -1 if there is no ask at all
	public int getLowestAskPrice(String stock){
		return DbBean.getLowestAskPrice(stock);
	}



	// retrieve unfulfiled current (lowest) ask for a particular stock
	// returns null if there is no unfulfiled asks for this stock
	private Ask getLowestAsk(String stock) throws SQLException {
		return DbBean.getLowestAsk(stock);
	}

	// get credit remaining for a particular buyer
	private static int getCreditRemaining(String buyerUserId) throws SQLException{
		return DbBean.getCreditRemaining(buyerUserId);
	}

	// check if a buyer is eligible to place an order based on his credit limit
	// if he is eligible, this method adjusts his credit limit and returns true
	// if he is not eligible, this method logs the bid and returns false
	private static boolean validateCreditLimit(Bid b) throws ClassNotFoundException,
	SQLException, NamingException {
		// calculate the total price of this bid
		int totalPriceOfBid = b.getPrice() * 1000; // each bid is for 1000
		// shares
		int remainingCredit = getCreditRemaining(b.getUserId());
		int newRemainingCredit = remainingCredit - totalPriceOfBid;

		if (newRemainingCredit < 0) {
			// no go - log failed bid and return false
			logRejectedBuyOrder(b);

			return false;
		} else {
			DbBean.updateCreditLimit(b.getUserId(),newRemainingCredit);
			return true;
		}
	}

	// call this to append all rejected buy orders to log file
	private static synchronized void logRejectedBuyOrder(Bid b) {
		try {
			PrintWriter outFile = new PrintWriter(new FileWriter(
					REJECTED_BUY_ORDERS_LOG_FILE, true));
			outFile.append(b.toString() + "\n");
			outFile.close();
		} catch (IOException e) {
			// Think about what should happen here...
			System.out.println("IO EXCEPTIOn: Cannot write to file");
			e.printStackTrace();
		} catch (Exception e) {
			// Think about what should happen here...
			System.out.println("EXCEPTION: Cannot write to file");
			e.printStackTrace();
		}
	}

	// call this to append all matched transactions in matchedTransactions to
	// log file and clear matchedTransactions
	private synchronized void logMatchedTransactions() {
		try {
			PrintWriter outFile = new PrintWriter(new FileWriter(
					MATCH_LOG_FILE, true));
			for (MatchedTransaction m : matchedTransactions) {
				outFile.append(m.toString() + "\n");
			}

			matchedTransactions.clear(); // clean this out
			outFile.close();
		} catch (IOException e) {
			// Think about what should happen here...
			System.out.println("IO EXCEPTIOn: Cannot write to file");
			e.printStackTrace();
		} catch (Exception e) {
			// Think about what should happen here...
			System.out.println("EXCEPTION: Cannot write to file");
			e.printStackTrace();
		}
	}

	// returns a string of HTML table rows code containing the list of user IDs
	// and their remaining credits
	// this method is used by viewOrders.jsp for debugging purposes
	public String getAllCreditRemainingForDisplay() throws Exception {
		String returnString = "";
		ResultSet rs = DbBean.selectAllCredit();
		while (rs.next()) {
			returnString += "<tr><td>" + rs.getString("userid") + "</td><td>"
					+ rs.getInt("credit_limit") + "</td></tr>";
		}
		return returnString;
	}

	// call this method immediatley when a new bid (buying order) comes in
	// this method returns false if this buy order has been rejected because of
	// a credit limit breach
	// it returns true if the bid has been successfully added
	public synchronized boolean placeNewBidAndAttemptMatch(Bid newBid) throws NamingException,ClassNotFoundException {
		// step 0: check if this bid is valid based on the buyer's credit limit
		try{
			DbBean.dbConnection.setAutoCommit(false);
			boolean okToContinue = validateCreditLimit(newBid);
			if (!okToContinue) {
				DbBean.addRejectBid(newBid);
				DbBean.dbConnection.setAutoCommit(true);
				return false;
			}

			// step 1: insert new bid into unfulfilledBids
			//add new bid to database
			DbBean.addNewBid(newBid);
			//update new bid status to matched


			// step 2: check if there is any unfulfilled asks (sell orders) for the
			// new bid's stock. if not, just return
			// count keeps track of the number of unfulfilled asks for this stock
			int count = DbBean.countUnfulfilledAsk(newBid.getStock());
			if (count == 0) {
				return true; // no unfulfilled asks of the same stock
			}
			if (count == -1 ){
				System.err.println("Error Occured!");
			}

			// step 3: identify the current/highest bid in unfulfilledBids of the
			// same stock
			//BEGIN TRANSACTION

			Bid highestBid = DbBean.getHighestBid(newBid.getStock());

			// step 4: identify the current/lowest ask in unfulfilledAsks of the
			// same stock
			Ask lowestAsk = DbBean.getLowestAsk(newBid.getStock());

			// step 5: check if there is a match.
			// A match happens if the highest bid is bigger or equal to the lowest
			// ask

			if (highestBid.getPrice() >= lowestAsk.getPrice()) {
				// this is a BUYING trade - the transaction happens at the higest
				// bid's timestamp, and the transaction price happens at the lowest
				// ask
				MatchedTransaction match = new MatchedTransaction(highestBid,
						lowestAsk, highestBid.getDate(), lowestAsk.getPrice());
				matchedTransactions.add(match);
				DbBean.addNewMatched(match,highestBid.getId(),lowestAsk.getId());
				// to be included here: inform Back Office Server of match
				// to be done in v1.0
				DbBean.updateBidMatch(highestBid);
				DbBean.updateAskMatch(lowestAsk);
				updateLatestPrice(match);
				logMatchedTransactions();
				System.out.println("New Match Found: " + match.toString());
				DbBean.dbConnection.commit();
				DbBean.dbConnection.setAutoCommit(true);
			}
			else{
				DbBean.dbConnection.commit();
				DbBean.dbConnection.setAutoCommit(true);
			}
		}
		catch(SQLException e){

			try {
				DbBean.dbConnection.rollback();
				DbBean.dbConnection.setAutoCommit(true);
			} catch (SQLException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}

		return true; // this bid is acknowledged
	}

	// call this method immediatley when a new ask (selling order) comes in
	public synchronized void placeNewAskAndAttemptMatch(Ask newAsk) {
		// step 1: insert new ask into unfulfilledAsks
		//unfulfilledAsks.add(newAsk);
		try{
			DbBean.dbConnection.setAutoCommit(false);
			DbBean.addNewAsk(newAsk);

			// step 2: check if there is any unfulfilled bids (buy orders) for the
			// new ask's stock. if not, just return
			// count keeps track of the number of unfulfilled bids for this stock
			int count = DbBean.countUnfulfilledBid(newAsk.getStock());
			if (count == 0 ) {
				return; // no unfulfilled asks of the same stock
			}
			if(count == -1){
				System.err.println("Error Occured!");
				return;
			}

			// step 3: identify the current/highest bid in unfulfilledBids of the
			// same stock

			// step 4: identify the current/lowest ask in unfulfilledAsks of the
			// same stock
			Bid highestBid = DbBean.getHighestBid(newAsk.getStock());
			// step 4: identify the current/lowest ask in unfulfilledAsks of the
			// same stock
			//Ask lowestAsk = getLowestAsk(newAsk.getStock());
			Ask lowestAsk = DbBean.getLowestAsk(newAsk.getStock());
			// step 5: check if there is a match.
			// A match happens if the lowest ask is <= highest bid

			if (lowestAsk.getPrice() <= highestBid.getPrice()) {
				// a match is found!
				//unfulfilledBids.remove(highestBid);
				//unfulfilledAsks.remove(lowestAsk);
				// this is a SELLING trade - the transaction happens at the lowest
				// ask's timestamp, and the transaction price happens at the highest
				// bid
				MatchedTransaction match = new MatchedTransaction(highestBid,
						lowestAsk, lowestAsk.getDate(), highestBid.getPrice());
				//matchedTransactions.add(match);
				DbBean.addNewMatched(match,highestBid.getId(),lowestAsk.getId());
				matchedTransactions.add(match);
				System.out.println("New Match Found: " + match.toString());
				// to be included here: inform Back Office Server of match
				// to be done in v1.0
				DbBean.updateBidMatch(highestBid);
				DbBean.updateAskMatch(lowestAsk);

				updateLatestPrice(match);
				logMatchedTransactions();
				DbBean.dbConnection.commit();
				DbBean.dbConnection.setAutoCommit(true);
			}
			else{
				DbBean.dbConnection.commit();
				DbBean.dbConnection.setAutoCommit(true);

			}
		}
		catch(SQLException e){

			try {
				DbBean.dbConnection.rollback();
				DbBean.dbConnection.setAutoCommit(true);
			} catch (SQLException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
	}


	// updates either latestPriceForSmu, latestPriceForNus or latestPriceForNtu
	// based on the MatchedTransaction object passed in
	private static void updateLatestPrice(MatchedTransaction m) {
		String stock = m.getStock();
		int price = m.getPrice();
		// update the correct attribute
		if (stock.equals("smu")) {
			latestPriceForSmu = price;
		} else if (stock.equals("nus")) {
			latestPriceForNus = price;
		} else if (stock.equals("ntu")) {
			latestPriceForNtu = price;
		}
	}

	// updates either latestPriceForSmu, latestPriceForNus or latestPriceForNtu
	// based on the MatchedTransaction object passed in
	public int getLatestPrice(String stock) throws SQLException {
		return DbBean.getCurrentPrice(stock);
	}


}
