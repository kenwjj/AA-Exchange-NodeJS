package aa;

import java.util.Date;

// represents a bid (in a buy order)
public class Bid {

	private String stock;
	private int price; // bid price
	private String userId; // user who made this buy order
	private Date date;
	private String status;
	private int id;

	// constructor
	public Bid(String stock, int price, String userId) {
		this.stock = stock;
		this.price = price;
		this.userId = userId;
		this.date = new Date();
		status = "unfulfilled";
		id = -1;
		// means havent insert into database
	}
	
	public Bid(String stock, int price, String userId, Date date,String status,int id) {
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
		return "id: " + id + ", stock: " + stock + ", price: " + price + ", userId: " + userId
				+ ", date: " + date;
	}
}
