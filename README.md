# Stellar Account as a Service

## Getting Started
Run this command inside project folder
```
npm install
```
Start the server with
```
npm start
```

**Note:** All the methods should now be available within `/api` subpath

## Testing
In order to run test on a fresh Replit database, we need to pass `CUSTOM_DB` environment variable which is a link to a shared Replit Database proxy [here](https://replit.com/@util/Replit-Database-proxy). By this way, we can have a clean working database and we can quickly erase test database without affecting the running application.

Run this script to test
```
npm test
```