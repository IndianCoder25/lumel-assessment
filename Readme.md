# Sales Data Project

This project provides:

- CSV Loader: Loads large sales data CSV into a normalized MySQL database using streaming and batch processing.
- Analytics API: Returns total customers, total orders, and average order value for a given date range.

---

## For Setup

1. **Download**
- node (v20.18.0)
- npm (10.8.2)
- MySQL

2. **Clone the repository**
```git clone <repo>```

3. **Install dependencies**
```npm install```

4. **Update the .ENV file for your database connection**

5. **Start the project**
```npm run dev```

## API endpoints
| HTTP Method  | Route | Body | Query Params | Description | Sample Response | 
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- | 
| POST  | /bulk  | csvFile = fileToBeuploaded | None | Used to handle the CSV data upload | {"msg": "user created","data": "data loaded in the DB"}
| GET  | customer/analytics | None | from = fromDate, to = toDate | Used to get analytics | {"total_customers": 1200,"total_orders": 1200,"average_order_value": 120}
