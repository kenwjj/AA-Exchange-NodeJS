package aa;

import java.util.Date;

//heyyyyy

// represents an Ask (in a sell order)
public class Ask {

	private String stock;
	private int price; // ask price
	private String userId; // user who made this sell order
	private Date date;
	private String status;
	private int id;

	// constructor
	public Ask(String stock, int price, String userId) {
		this.stock = stock;
		this.price = price;
		this.userId = userId;
		this.date = new Date();
		status = "unfulfilled";
		id = -1;
	}
	
	public Ask(String stock, int price, String userId, Date date,String status, int id) {
		this.stock = stock;
		this.price = price;
		this.userId = userId;
		this.date = date;
		this.status = status;
		this.id = id;
	}

	// getters
	public String getStock() {
		return stock;
	}

	public int getPrice() {
		return price;
	}

	public String getUserId() {
		return userId;
	}

	public Date getDate() {
		return date;
	}
	
	public int getId(){
		return id;
	}
	// toString
	public String toString() {
		return " stock: " + stock + ", price: " + price + ", userId: " + userId
				+ ", date: " + date;
	}
}