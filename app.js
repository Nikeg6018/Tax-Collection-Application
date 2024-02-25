const express = require('express');
const routesUser = require('./Server/routes/routesUser');
const routesAdmin = require('./Server/routes/routesAdmin');
const routesWeb = require('./Server/routes/routesWeb');
const connectDB = require('./Server/database/connection');
const bodyParser = require('body-parser');
const Bree = require('bree');
const cookie = require('cookie-parser');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Database connect
connectDB();



// Timer for bill update
const bree = new Bree({
    jobs: [
        // Run populate cache job 3 month
        {
            name: 'sendMail',
            interval: 'every 3 months'
        }
    ]
});

bree.start();

// For get body data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookie());

// set view engine
app.set('view engine', 'ejs');

// load assets
app.use('/css', express.static(path.resolve(__dirname, 'assets/css')));
app.use('/img', express.static(path.resolve(__dirname, 'assets/img')));
app.use('/js', express.static(path.resolve(__dirname, 'assets/js')));
app.use('/Docs', express.static(path.resolve(__dirname, 'Docs')));
app.use('/Download', express.static(path.join(__dirname, 'Download')));


const oneDay = 1000 * 60 * 60 * 24;
// session for login
app.use(session({
    secret: uuidv4(),
    saveUninitialized: true,
    resave: false,
    cookie: { maxAge: oneDay },
}));

// Routes for user
app.use('/user', routesUser);
app.use('/admin', routesAdmin);
app.use('/', routesWeb);

module.exports = app;