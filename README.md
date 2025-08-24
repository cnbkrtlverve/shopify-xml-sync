# Shopify XML Sync

## Overview
The Shopify XML Sync application is designed to facilitate the synchronization of products between an XML feed and a Shopify store. This application allows users to initiate synchronization processes and monitor connection statuses through a user-friendly control panel.

## Features
- Fetch and parse product data from an XML feed.
- Update existing products in Shopify based on the XML data.
- Create new products in Shopify when they are added to the XML feed.
- Display connection statuses for both the XML feed and Shopify.

## Project Structure
```
shopify-xml-sync
├── public
│   ├── css
│   │   └── style.css        # Styles for the control panel
│   ├── js
│   │   └── main.js          # Client-side JavaScript for user interactions
│   └── index.html           # Main HTML file for the control panel
├── src
│   ├── controllers
│   │   └── syncController.ts # Handles synchronization requests
│   ├── routes
│   │   └── syncRoutes.ts     # Defines routes for synchronization
│   ├── services
│   │   ├── shopifyService.ts  # Interacts with the Shopify API
│   │   └── xmlService.ts      # Fetches and parses the XML feed
│   ├── types
│   │   └── product.ts         # Defines the product structure
│   ├── app.ts                 # Entry point of the application
│   └── config.ts              # Configuration settings
├── .env.example                # Template for environment variables
├── package.json                # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                  # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd shopify-xml-sync
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template and fill in your API keys and other necessary configurations.

## Usage
1. Start the application:
   ```
   npm start
   ```

2. Open your web browser and navigate to `http://localhost:3000` to access the control panel.

3. Use the buttons in the control panel to start the synchronization process and monitor the connection statuses.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.