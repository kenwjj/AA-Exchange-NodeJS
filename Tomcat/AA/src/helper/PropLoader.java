package helper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class PropLoader {

	
	private final String propsPath = "config.properties";
	private static Properties prop = new Properties();
	private InputStream input = null;

	public PropLoader() {
		try {
			input = this.getClass().getClassLoader()
					.getResourceAsStream(propsPath);

			if (input == null) {
				System.out.println("Load Properties Failed");
			}
			prop.load(input);
		} catch (IOException ex) {
			ex.printStackTrace();
		} finally {
			if (input != null) {
				try {
					input.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
	}

	public static String getProperty(String key) {
		return prop.getProperty(key);
	}

}
