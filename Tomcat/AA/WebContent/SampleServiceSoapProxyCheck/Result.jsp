<%@page contentType="text/html;charset=UTF-8"%>
<% request.setCharacterEncoding("UTF-8"); %>
<HTML>
<HEAD>
<TITLE>Result</TITLE>
</HEAD>
<BODY>
<H1>Result</H1>

<jsp:useBean id="SampleServiceSoapProxyCheckid" scope="session" class="webservice.ServiceSoapProxy" />
<%
	if (request.getParameter("endpoint") != null && request.getParameter("endpoint").length() > 0)
SampleServiceSoapProxyCheckid.setEndpoint(request.getParameter("endpoint"));
%>

<%
	String method = request.getParameter("method");
int methodID = 0;
if (method == null) methodID = -1;

if(methodID != -1) methodID = Integer.parseInt(method);
boolean gotMethod = false;

try {
switch (methodID){ 
case 2:
        gotMethod = true;
        java.lang.String getEndpoint2mtemp = SampleServiceSoapProxyCheckid.getEndpoint();
if(getEndpoint2mtemp == null){
%>
<%=getEndpoint2mtemp%>
<%
	}else{
        String tempResultreturnp3 = org.eclipse.jst.ws.util.JspUtils.markup(String.valueOf(getEndpoint2mtemp));
%>
        <%=tempResultreturnp3%>
        <%
        	}
        break;
        case 5:
                gotMethod = true;
                String endpoint_0id=  request.getParameter("endpoint8");
                    java.lang.String endpoint_0idTemp = null;
                if(!endpoint_0id.equals("")){
                 endpoint_0idTemp  = endpoint_0id;
                }
                SampleServiceSoapProxyCheckid.setEndpoint(endpoint_0idTemp);
        break;
        case 10:
                gotMethod = true;
                webservice.ServiceSoap getServiceSoap10mtemp = SampleServiceSoapProxyCheckid.getServiceSoap();
        if(getServiceSoap10mtemp == null){
        %>
<%=getServiceSoap10mtemp %>
<%
}else{
        if(getServiceSoap10mtemp!= null){
        String tempreturnp11 = getServiceSoap10mtemp.toString();
        %>
        <%=tempreturnp11%>
        <%
        }}
break;
case 13:
        gotMethod = true;
        String teamId_1id=  request.getParameter("teamId16");
            java.lang.String teamId_1idTemp = null;
        if(!teamId_1id.equals("")){
         teamId_1idTemp  = teamId_1id;
        }
        String teamPassword_2id=  request.getParameter("teamPassword18");
            java.lang.String teamPassword_2idTemp = null;
        if(!teamPassword_2id.equals("")){
         teamPassword_2idTemp  = teamPassword_2id;
        }
        String transactionDescription_3id=  request.getParameter("transactionDescription20");
            java.lang.String transactionDescription_3idTemp = null;
        if(!transactionDescription_3id.equals("")){
         transactionDescription_3idTemp  = transactionDescription_3id;
        }
        boolean processTransaction13mtemp = SampleServiceSoapProxyCheckid.processTransaction(teamId_1idTemp,teamPassword_2idTemp,transactionDescription_3idTemp);
        String tempResultreturnp14 = org.eclipse.jst.ws.util.JspUtils.markup(String.valueOf(processTransaction13mtemp));
        %>
        <%= tempResultreturnp14 %>
        <%
break;
case 22:
        gotMethod = true;
        String teamId_4id=  request.getParameter("teamId25");
            java.lang.String teamId_4idTemp = null;
        if(!teamId_4id.equals("")){
         teamId_4idTemp  = teamId_4id;
        }
        String teamPassword_5id=  request.getParameter("teamPassword27");
            java.lang.String teamPassword_5idTemp = null;
        if(!teamPassword_5id.equals("")){
         teamPassword_5idTemp  = teamPassword_5id;
        }
        boolean clear22mtemp = SampleServiceSoapProxyCheckid.clear(teamId_4idTemp,teamPassword_5idTemp);
        String tempResultreturnp23 = org.eclipse.jst.ws.util.JspUtils.markup(String.valueOf(clear22mtemp));
        %>
        <%= tempResultreturnp23 %>
        <%
break;
}
} catch (Exception e) { 
%>
Exception: <%= org.eclipse.jst.ws.util.JspUtils.markup(e.toString()) %>
Message: <%= org.eclipse.jst.ws.util.JspUtils.markup(e.getMessage()) %>
<%
return;
}
if(!gotMethod){
%>
result: N/A
<%
}
%>
</BODY>
</HTML>