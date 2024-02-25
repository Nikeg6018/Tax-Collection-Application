const express = require('express');
const services = require('./../services/render');
const adminController = require('./../controller/adminController');
const authController = require('./../controller/authController');

const router = express.Router();

// ! render
// login and Sign up page
router.get('/SignUp', services.AdminSignUp);
router.get('/Login', services.AdminLogin);

// ! API
// Login and Sign up APIs
router.post('/api/SignUpOTP', adminController.SignUpOTP);
router.get('/SignUpOTP/:id', adminController.verifyOTP);
router.post('/api/SignUp', adminController.create);
router.post('/api/Login', adminController.login);

// logout 
router.get('/logout', adminController.exit);

// Forgot Password
router.post('/api/forgot', adminController.forgot);
router.get('/forgot/:id', adminController.passwordEdit);
router.post('/api/forgotPassword/:id', adminController.passwordEditSubmit);


router.use(authController.isLoggedIn);
// Admin DashBoard
router.get('/dashBoard', adminController.dashBoard);

// Report for Admin
router.get('/dashBoard/Report', adminController.ReportDownload, adminController.Report);

// Tenament Detailes
router.get('/dashBoard/details/:tenment', adminController.details);

// Admin Profile edit
router.get('/dashBoard/adminProfile', adminController.adminProfile);
router.get('/dashBoard/adminProfile/adminProfileEdit', adminController.adminProfileEdit);
router.post('/dashBoard/adminProfile/adminProfileEdit/adminProfileEditSubmit', adminController.adminProfileEditSubmit);

// Admin GET user list
router.get('/dashBoard/userDetails', adminController.userDetails);
router.get('/dashBoard/userDetailsEdit/:id', adminController.userDetailsEdit);
router.post('/dashBoard/userDetailsAdd/:id', adminController.userDetailsAdd);
router.post('/dashBoard/userDetailsRemove/:id', adminController.userDetailsRemove);

// Search bar in Dashboard
router.post('/api/dashBoard', adminController.search);
router.post('/api/graphData', adminController.graphData);

// Search bar in user list
router.post('/api/dashBoard/searchUser', adminController.searchUser);

// Adding Property Detailes
router.get('/dashBoard/addTenment', adminController.TenamentEntry);
router.post('/api/tenmentEntry', adminController.tenmentEntry);

// Property Request
router.get('/dashBoard/propertyRequest', adminController.propertyRequest);

module.exports = router;