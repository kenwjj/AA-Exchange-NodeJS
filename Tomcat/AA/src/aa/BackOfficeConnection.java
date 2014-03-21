package aa;


import helper.PropLoader;

import java.io.*;
import java.util.*;

import webservice.ServiceSoap;
import webservice.ServiceSoapProxy;

public class BackOfficeConnection  extends TimerTask {

	private final String username = PropLoader.getProperty("username");
	private final String password = PropLoader.getProperty("password");
	
	private final String BACK_OFFICE_COUNT_LOG_FILE = "c:\\temp\\countBackOffice.log";
	private final String MATCH_LOG_FILE = "c:\\temp\\matched.log";
	
    private int logCount = 0;
    private BufferedReader matchReader = null;
    private BufferedReader logReader = null;
    private PrintWriter logWriter = null;
/*    
    public BackOfficeConnection() {
        System.out.println("Reading count log...");
        try {
        	File f1 = new File(BACK_OFFICE_COUNT_LOG_FILE);
        	if(f1.exists() && !f1.isDirectory()) { 
	            logReader = new BufferedReader(new FileReader(BACK_OFFICE_COUNT_LOG_FILE));
	            if(logReader.readLine()!=null){
	            	logCount = Integer.parseInt(logReader.readLine());
	            }
	            logReader.close();
        	}
            System.out.println("Log Count is " + logCount);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }*/

    public void run() {
        try {
        	File f2 = new File(MATCH_LOG_FILE);
        	if(f2.exists() && !f2.isDirectory()) {
	            matchReader = new BufferedReader(new FileReader(MATCH_LOG_FILE));
	            String sCurrentLine;
	            
	            for (int i = 0; i < logCount; i++) {
	                matchReader.readLine();
	            }
	            
	            while ((sCurrentLine = matchReader.readLine()) != null) {
	                if (sendToBackOffice(sCurrentLine)) {
	                    System.out.println("Updating log count");
	                    logWriter = new PrintWriter(new FileWriter("c:\\temp\\countBackOffice.log"));
	                    logWriter.print(++logCount);
	                    logWriter.close();
	                }
	            }
        	}
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (matchReader != null) matchReader.close();
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }
    }
    
    
    public boolean sendToBackOffice(String txnDescription) {
    	
		webservice.ServiceSoapProxy service = new webservice.ServiceSoapProxy();
		boolean status = false;

		try {
			// create new instances of remote Service objects
			ServiceSoap port = service.getServiceSoap();

			// invoke the remote method by calling port.processTransaction().
			// processTransaction() will return false if the teamID &/or
			// password is wrong
			// it will return true if the web service is correctly called
			status = port
					.processTransaction(username, password, txnDescription);
		
		} catch (Exception ex) {
			// may come here if a time out or any other exception occurs
			
			//status = sendToBackupBackOffice(txnDescription);
		}
		return status; 
	}
    
/*	public boolean sendToBackupBackOffice(String txnDescription) {
		try {
			webserviceBackup.ServiceSoapProxy service = new webserviceBackup.ServiceSoapProxy();
			boolean status = false;

			// create new instances of remote Service objects
			webserviceBackup.ServiceSoap port = webserviceBackup
					.getServiceSoap();

			// invoke the remote method by calling port.processTransaction().
			// processTransaction() will return false if the teamID &/or
			// password is wrong
			// it will return true if the web service is correctly called
			status = port
					.processTransaction(username, password, txnDescription);
			return status;

		} catch (Exception ex) {
			// both primary and secondary web services are down
			System.out.println("Web Service Exception!");
		}
		return false; // failure due to exception
	}*/
}
