/**
 * ServiceSoap.java
 *
 * This file was auto-generated from WSDL
 * by the Apache Axis 1.4 Apr 22, 2006 (06:55:48 PDT) WSDL2Java emitter.
 */

package webservice;

public interface ServiceSoap extends java.rmi.Remote {
    public boolean processTransaction(java.lang.String teamId, java.lang.String teamPassword, java.lang.String transactionDescription) throws java.rmi.RemoteException;
    public boolean clear(java.lang.String teamId, java.lang.String teamPassword) throws java.rmi.RemoteException;
}
