const express = require('express');
const services = require('./../services/render');
const userController = require('./../controller/userController');
const multer = require('multer');
const authController = require('./../controller/authController');

const router = express.Router();

let array = [];
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './Docs/');
    },
    filename: function (req, file, cb) {
        array.push(req.body.propertyNumber + '-' + file.fieldname + '.' + file.mimetype.split('/')[1])
        cb(null, req.body.propertyNumber + '-' + file.fieldname + '.' + file.mimetype.split('/')[1]);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'img' && file.mimetype.split('/')[0] !== 'image') {
            return cb(new Error('Invalid file type, only images are allowed for img field'));
        } else if (file.fieldname.startsWith('pdf') && file.mimetype !== 'application/pdf') {
            return cb(new Error('Invalid file type, only PDFs are allowed for pdf fields'));
        }
        cb(null, true);
        req.body["files"] = array;
    }
});

// ! render
// login and Sign up page
router.get('/signUp', services.UserSignUp);
router.get('/login', services.UserLogin);

// transaction success or fail page
router.get('/cancel', services.cancel);
router.get("/success/:Transcation_ID/:Reference", services.successPage);

// ! API
// Login and Sign up APIs
router.post('/api/SignUpOTP', userController.SignUpOTP);
router.get('/SignUpOTP/:id', userController.verifyOTP);
router.post('/api/signUp', userController.create);
router.post('/api/login', userController.login);

// log out 
router.get('/logout', userController.exit);

// Forgot Password
router.post('/api/forgot', userController.forgot);
router.get('/forgot/:id', userController.passwordEdit);
router.post('/api/forgotPassword/:id', userController.passwordEditSubmit);

router.use(authController.protect);
// router.use(authController.isLoggedIn);

// Bill Board
router.get('/BillDashbord', userController.billboard);

// Edit user Detailes
router.get('/BillDashbord/userProfile', userController.userProfile);
router.get('/BillDashbord/userProfile/userEdit', userController.userEdit);
router.post('/BillDashbord/userProfile/userEdit/userEditSubmit', userController.userEditSubmit);

// Bill page
router.get('/BillDashbord/BillPayment/:tenment', userController.billDetails);
router.get('/BillDashbord/allBillPayment', userController.allBillDetails);

// Payment and mail send 
router.post("/BillDashbord/payment/:id", userController.payment);
router.get("/paymentSuccess/:id/:Transcation_ID/:Reference", userController.success);
router.post("/successMail/:id/:Transcation_ID/:Reference", userController.PaymentMail);

// Payment of All the billes and mail send
router.post('/BillDashbord/AllBillPayment', userController.paymentAllBill);
router.get("/paymentSuccess/:Transcation_ID/:Reference", userController.successAll);
router.post("/successMail/:Transcation_ID/:Reference", userController.AllPaymentMail);

// Download Receipt
router.get('/BillDashbord/Download/:id', userController.downloadReceipe);

// addProperty and buy and sell
router.get('/BillDashboard/upload', userController.addProperty)
router.post('/api/BillDashboard/upload', upload.fields([{ name: 'photo' }, { name: 'propertyDocument' }]), userController.addPropertyRequest);

// sell Property
router.get('/BillDashboard/sell', userController.sellProperty);
router.post('/api/BillDashboard/sell', upload.fields([{ name: 'sellPhoto', maxCount: 1 }, { name: 'propertyDocument', maxCount: 1 }, { name: 'saleDead', maxCount: 1 }, { name: 'paymentStamp', maxCount: 1 }]), userController.sellPropertyRequest);

// Buy Property
router.get('/BillDashboard/buy', userController.buyProperty);
router.post('/api/BillDashboard/buy', upload.fields([{ name: 'buyerPhoto', maxCount: 1 }]), userController.buyPropertyRequest);


module.exports = router;