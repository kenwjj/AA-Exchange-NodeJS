<!DOCTYPE html>
<jsp:useBean id="dbBean" scope="application" class="aa.DbBean" />
<html>
    <head>
        <title>index</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body style="background-color:pink;">
       <%dbBean.addIndex();%>
       Index Added!
    </body>
</html>