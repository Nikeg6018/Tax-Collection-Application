
# Tax Collection Website

* This is a web application designed to facilitate tax collection from the country's citizens. 
* It provides a user-friendly interface for taxpayers to pay their taxes online, while also offering government officials an administrative dashboard to monitor tax collection statistics.

# Features

* **User Dashboard** : Allows users to easily pay their taxes online.
* **Admin Dashboard** : Provides government officials with graphical representations of tax collection data, including details on individual taxpayer payments and pending taxes.
* **Sorting Functionality** : Users and admins can sort tax collection data based on date ranges to analyze total tax collection within specific timeframes.

# Technologies Used
* **Node.js** : Server-side JavaScript runtime environment.
* **Express.js** : Web application framework for Node.js.
* **MongoDB** : NoSQL database used for storing tax collection data.
* **Mongoose** : MongoDB object modeling for Node.js.
* **Stripe** : Payment gateway integration for online tax payments.
* **EJS** : Templating language for generating HTML markup with JavaScript.

#  Demo
This application is deployed on **Render** Please check it out 😄 [here](https://tax-collection-application.onrender.com)

See admin dashboard [demo](https://tax-collection-application.onrender.com/admin/login)

#  Cred
| Email              | Password     | access  |
| :----------------- | :----------- | :------ |
| `nikunj@gmail.com` | `1234567890` | `User`  |
| `admin@gmail.com`  | `1234567890` | `Admin` |

# Installation

 1. Clone the repository :
```bash
https://github.com/nikunj05122/Tax-Collection-Application.git
```

 2. Install dependencies :
```bash
cd Tax-Collection-Application
npm install
```

 3. Set up environment variables:
* Create a `config.env` file in the root directory and add the following variables:
```bash
DATABASE_URL = your_mongodb_uri
DATABASE_PASSWORD = your_mongodb_password
EMAIL = your_email_use_for_send_email
PASS = your_email_password
SECRET_KEY = stripe_secret_key
PUBLISHABLE_KEY = stripe_publishable_key
JWT_SECRET = your_jwt_secret
JWT_COOKIE_EXPIRES_IN = jwt_cookie_expires
JWT_EXPIRES_IN = jwt_expires
URL = url_of_your_host_use_in_mail
PORT = 4000
```

4. Run the application :
```bash
npm start
```

# Usage
* Once the application is running, you can access it through your web browser at http://localhost:4000.
* Users can navigate to the user dashboard to pay their taxes online.
* Admins can access the admin dashboard to view graphical tax collection data and sort tax records based on specific date ranges.

