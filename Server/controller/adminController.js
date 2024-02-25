var { AdminDB, TenamentDB, paymentDB, UserDB, TempAdminDB, PandingTenamentDB, addPropertyDB, sellDB, buyDB } = require('./../model/model');
var randomstring = require("randomstring");
const fs = require('fs');
const pdf = require('pdf-creator-node');
const path = require('path');
const options = require('./../../assets/js/options');
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Console } = require('console');

dotenv.config({ path: `${__dirname}/../../config.env` });

const LOCAL_URL = process.env.URL;

const EMAIL = process.env.EMAIL;
const PASS = process.env.PASS;

exports.SignUpOTP = async (req, res) => {

    // validate request
    if (JSON.stringify(req.body) === '{}') {
        res.status(400).render('Admin_SignUp', { title: "Sign Up", alert: false, submit: false, action: '/admin/api/SignUpOTP', OTPalert: false });
        return;
    }

    const ConfirmPassword = req.body.ConfirmPassword;
    const Password = req.body.password;

    if (ConfirmPassword === Password) {
        try {
            const OTPNumber = randomstring.generate({ length: 6, readable: true, charset: 'numeric' });
            let config = {
                service: 'gmail',
                auth: {
                    user: EMAIL,
                    pass: PASS
                }
            }

            let transporter = nodemailer.createTransport(config);

            let MailGenerator = new Mailgen({
                theme: "default",
                product: {
                    name: "AMC",
                    link: `${LOCAL_URL}`,
                    copyright: 'Copyright © 2019. All rights reserved.'
                }
            });

            var response = {
                body: {
                    name: `${req.body.name}`,
                    intro: 'Because the signup information was accurate, you have received this email.',
                    dictionary: {
                        instructions: `Your One-Time-password (OTP) : ${OTPNumber}`
                    },
                    outro: 'Make sure to enter the correct otp.'
                }
            };

            let mail = MailGenerator.generate(response);

            let message = {
                from: EMAIL,
                to: req.body.email,
                subject: "OTP for sign up.",
                html: mail
            }

            // await transporter.sendMail(message);
            req.body.OTP = OTPNumber;
            const TempAdmin = await TempAdminDB.create(req.body);
            res.redirect(`/admin/SignUpOTP/${TempAdmin._id.valueOf()}`);
        } catch (err) {
            res.status(500).send({
                message: err.message || "Some error occured while sending the email, please sign up again."
            });
        }
    } else {
        res.status(500).render('Admin_SignUp', { title: "Sign Up", user: req.body, alert: true, submit: false, action: '/admin/api/SignUpOTP', OTPalert: false });
    }
}

exports.verifyOTP = async (req, res) => {
    try {
        const tempadmin = await TempAdminDB.findById(req.params.id);
        res.status(200).render('Admin_SignUp', { title: "Sign Up", user: tempadmin, alert: false, submit: true, action: '/admin/api/signUp', OTPalert: false });
    } catch (err) {
        res.status(500).json({
            status: 'Fail',
            message: 'Server down, try again after some time.'
        });
    }
}

exports.create = async (req, res) => {

    try {
        const tempadminData = await TempAdminDB.findById(req.body.id);
        const OTP = req.body.OTP;

        if (OTP == tempadminData.OTP) {
            try {
                const admin = await AdminDB.create(req.body);
                await TempAdminDB.findByIdAndDelete(req.body.id);
                res.status(200).redirect('/admin/Login');
            } catch (err) {
                res.status(500).send({
                    message: err.message || "Server down, try again after some time."
                });
            }
        } else {
            res.status(500).render('Admin_SignUp', { title: "Sign Up", user: req.body, alert: true, submit: true, action: '/admin/api/signUp', OTPalert: true });
        }
    } catch (err) {
        await TempAdminDB.findByIdAndDelete(req.body.id);
        res.status(500).json({
            status: 'Fail',
            message: 'Server down, try again after some time.'
        });
    }

}

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

exports.login = async (req, res) => {

    try {
        const data = await AdminDB.find({ $and: [{ email: req.body.email }, { password: req.body.password }] });
        if (data.length == 0) {
            res.status(500).render('Admin_Login', { title: "Login", alert: true });
        } else {
            const token = signToken(data[0]._id.valueOf());
            const cookieOption = {
                expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
                // httpOnly: true,
                // secure: true
            }
            res.cookie('jwt', token, cookieOption);
            setTimeout(() => {
                res.status(200).redirect(`/admin/dashBoard`);
            }, 2000);
        }
    } catch (err) {
        res.status(500).json({
            status: 'Fail',
            message: 'Due to inactivty, you are logged out.'
        });
    }
}

exports.forgot = async (req, res) => {
    try {

        const AdminData = await AdminDB.find(req.body);

        if (AdminData.length) {
            let config = {
                service: 'gmail',
                auth: {
                    user: EMAIL,
                    pass: PASS
                }
            }

            let transporter = nodemailer.createTransport(config);

            let MailGenerator = new Mailgen({
                theme: "default",
                product: {
                    name: "AMC",
                    link: `${LOCAL_URL}`,
                    copyright: 'Copyright © 2019. All rights reserved.'
                }
            });

            var response = {
                body: {
                    name: `${AdminData[0].name}`,
                    intro: 'You have received this email because a password reset request for your account was received.',
                    action: {
                        instructions: 'Click the button below to reset your password:',
                        button: {
                            color: '#ed3266', // Optional action button color
                            text: 'Reset your password',
                            link: `${LOCAL_URL}/admin/forgot/${AdminData[0]._id.valueOf()}`
                        }
                    },
                    outro: 'If you did not request a password reset, no further action is required on your part.'
                }
            };

            let mail = MailGenerator.generate(response);

            let message = {
                from: EMAIL,
                to: AdminData[0].email,
                subject: "Forgot your admin password.",
                html: mail
            }

            // await transporter.sendMail(message);

            res.status(200).render('forgot', { title: 'Admin Forgot Page', UserForgot: false, send: true, alert: false });
        } else {
            res.status(200).render('forgot', { title: 'Admin Forgot Page', UserForgot: false, send: false, alert: true });
        }

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.passwordEdit = async (req, res) => {
    try {
        const id = req.params.id;
        res.status(200).render('passwordPage', { title: "User Details Edit", id: id, UserForgot: false, alert: false });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.passwordEditSubmit = async (req, res) => {
    try {
        const id = req.params.id;
        if (req.body.password === req.body.ConfirmPassword) {
            const data = {
                password: req.body.password
            }

            await AdminDB.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });

            res.status(200).redirect(`/admin/login`);
        } else {
            res.status(200).render('passwordPage', { title: "User Details Edit", id: id, UserForgot: false, alert: true });
        }

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.exit = async (req, res) => {
    const cookieOption = {
        expires: new Date(Date.now()),
        httpOnly: true
    }
    res.cookie('jwt', '', cookieOption);
    res.status(204).redirect('/');
}

exports.dashBoard = async (req, res) => {
    try {
        const payData = await paymentDB.find({ Status: true });

        const year = [0, 0, 0, 0, 0];

        for (var i = 0; i < payData.length; i++) {
            if (payData[i].paymentYear == ('' + new Date().getFullYear())) {
                year[4] += payData[i].Total;
            }
            else if (payData[i].paymentYear == ('' + (new Date().getFullYear() - 1))) {
                year[3] += payData[i].Total;
            }
            else if (payData[i].paymentYear == ('' + (new Date().getFullYear() - 2))) {
                year[2] += payData[i].Total;
            }
            else if (payData[i].paymentYear == ('' + (new Date().getFullYear() - 3))) {
                year[1] += payData[i].Total;
            }
            else if (payData[i].paymentYear == ('' + (new Date().getFullYear() - 4))) {
                year[0] += payData[i].Total;
            }
        }

        const tenmentData = await TenamentDB.find({ Status: true });
        const tenData = [0, 0, 0, 0, 0, 0, 0, 0]
        for (var i = 0; i < tenmentData.length; i++) {
            tenData[0] += tenmentData[i].Property_tax;
            tenData[1] += tenmentData[i].Water_tax;
            tenData[2] += tenmentData[i].Drainage_tax;
            tenData[3] += tenmentData[i].SW_tax;
            tenData[4] += tenmentData[i].Street_Light;
            tenData[5] += tenmentData[i].Fire_Charge;
            tenData[6] += tenmentData[i].Env_improve_charge;
            tenData[7] += tenmentData[i].Education_Cess;
        }

        const correntYearData = await TenamentDB.find();
        const taluka = new Set();
        for (var i = 0; i < correntYearData.length; i++) {
            taluka.add(correntYearData[i].Taluka);
        }

        const userBill = new Map();
        taluka.forEach((TalukaName) => {
            userBill.set(TalukaName, []);
        });

        taluka.forEach((TalukaName) => {
            for (var i = 0; i < correntYearData.length; i++) {
                if (TalukaName == correntYearData[i].Taluka) {
                    userBill.get(TalukaName).push(correntYearData[i]);
                }
            }
        });


        const addProperty = await addPropertyDB.find();
        const sell = await sellDB.find();

        const totalRequest = addProperty.length + sell.length;

        res.status(200).render('DashBoard', { title: "DashBoard", User: req.user, year: year, tenData: tenData, userBill: userBill, totalRequest: totalRequest });
    } catch (err) {
        res.status(500).json({
            status: 'Fail',
            message: 'Server down, try again after some time.'
        });
    }
}

exports.search = async (req, res) => {

    try {
        const searchData = await TenamentDB.find(req.body);
        res.status(200).json({ data: searchData[0] });

    } catch (err) {
        res.status(500).json({
            status: "Fail",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.graphData = async (req, res) => {
    try {

        const start = new Date(req.body.Starting);
        const end = new Date(req.body.ending);
        const taluka = req.body.taluka;
        let searchData = await paymentDB.aggregate([
            {
                $match: {
                    Date: {
                        $gte: start,
                        $lte: end
                    },
                    ...(taluka ? { taluka: taluka } : {})
                }
            }
        ]);

        res.status(200).json({
            data: searchData
        });

    } catch (err) {
        res.status(500).json({
            status: "Fail",
            message: err.message || "Server down, try again after some time."
        });
    }
}

exports.searchUser = async (req, res) => {
    try {
        let searchData = await UserDB.find(req.body);
        let sortedTenment = searchData[0].tenment.sort();
        searchData[0].tenment = sortedTenment;
        res.status(200).json({ data: searchData[0] });
    } catch (err) {
        res.status(500).json({
            status: "Fail",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.details = async (req, res) => {
    try {
        const userData = await UserDB.find({ tenment: req.params.tenment });
        const tenmentData = await TenamentDB.find({ tenament: req.params.tenment });
        const paymentData = await paymentDB.find({ tenament: req.params.tenment });

        res.status(200).render('Details', { title: "Details", User: req.user, TenmentDetails: tenmentData[0], UserDetails: userData, PaymentDetails: paymentData })

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
        });
    }
}

exports.adminProfile = async (req, res) => {
    try {
        const id = req.user._id;

        var data = await AdminDB.findById(id);
        res.status(200).render('adminPage', { title: "User Details", User: data });
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.adminProfileEdit = async (req, res) => {
    try {
        const id = req.user._id;

        var data = await AdminDB.findById(id);
        res.status(200).render('adminEditPage', { title: "User Details", User: data });
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.adminProfileEditSubmit = async (req, res) => {
    try {
        const id = req.user._id;
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        }

        await AdminDB.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });

        res.status(200).redirect(`/admin/dashBoard/adminProfile`);

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.userDetails = async (req, res) => {
    try {
        let userData = await UserDB.find();
        for (let i = 0; i < userData.length; i++) {
            let sortedTenment = userData[i].tenment.sort();
            userData[i].tenment = sortedTenment;
        }
        res.status(200).render('User_Details', { title: "User Details", User: req.user, userData: userData });

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.'
        });
    }
}

exports.userDetailsEdit = async (req, res) => {
    try {
        const id = req.params.id;
        let userData = await UserDB.findById(id);
        let sortedTenment = userData.tenment.sort();
        userData.tenment = sortedTenment;
        res.status(200).render('User_Details_Edit', { title: "Add Tenment Details", User: req.user, userData: userData, alert: false, dataIsEmpty: false });

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.'
        });
    }
}

exports.userDetailsAdd = async (req, res) => {
    try {
        if (req.user) {

            const tenmentVerify = await UserDB.find({ tenment: req.body.tenament });
            const id = req.params.id;
            const tenamentData = await TenamentDB.find({ tenament: req.body.tenament });
            const dataIsEmpty = tenamentData.length == 0 ? true : false;

            const oldUserData = await UserDB.findById(id);
            if (tenmentVerify.length == 0 && !dataIsEmpty) {

                const Tenment = oldUserData.tenment;
                Tenment.push(req.body.tenament);

                const data = {
                    tenment: Tenment
                }
                const updateData = await UserDB.findByIdAndUpdate(id, data, {
                    new: true,
                    runValidators: true
                });

                res.status(300).redirect(`/admin/dashBoard/userDetailsEdit/${id}`);
            } else {
                res.status(200).render('User_Details_Edit', { title: "Add Tenment Details", User: req.user, userData: oldUserData, alert: true, tenamentData: tenamentData[0], dataIsEmpty: dataIsEmpty });
            }

        }
        else {
            res.status(500).json({
                status: "Fail",
                message: "Due to inactivty, you are logged out."
            });
        }

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err.message
        });
    }
}

exports.userDetailsRemove = async (req, res) => {
    try {
        const id = req.params.id;

        const oldUserData = await UserDB.findById(id);
        const Tenment = [];

        for (var i = 0; i < oldUserData.tenment.length; i++)
            if (oldUserData.tenment[i] != req.body.tenament)
                Tenment.push(oldUserData.tenment[i]);

        const data = {
            tenment: Tenment
        }
        const updateData = await UserDB.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });

        res.status(200).redirect(`/admin/dashBoard/userDetailsEdit/${id}`);

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.'
        });
    }
}

exports.TenamentEntry = (req, res) => {
    res.render('addTenament', { title: "Add Property Details", User: req.user });
}

exports.tenmentEntry = async (req, res) => {

    try {

        const tenament = req.body.Tenment;
        const Taluka = req.body.Taluka;
        const Name = req.body.Name;
        const Postal_address = req.body.Postal_address;
        const Local_address = req.body.Local_address;
        const Usage = req.body.Usage;
        const Occupier = req.body.Occupier;
        const Property_Width = req.body.PropertyWidth * 1;
        const Property_Length = req.body.PropertyLength * 1;
        const Property_tax = Property_Width * Property_Length * 6;
        const Water_tax = (Math.random() * 800) + 150;
        const Drainage_tax = (Math.random() * 400) + 50;
        const SW_tax = (Math.random() * 800) + 150;
        const Rebate = ((-1) * (Math.random() * 50) + 0);
        const Education_Cess = (Property_tax + Water_tax + Drainage_tax + SW_tax + 100 + 1245 + 30) * (0.05);
        const Total = Property_tax + Water_tax + Drainage_tax + SW_tax + 150 + 1245 + 100 + Rebate + Education_Cess;

        const tenmentData = {
            tenament: tenament,
            Taluka: Taluka,
            Name: Name,
            Postal_address: Postal_address,
            Local_address: Local_address,
            Usage: Usage,
            Occupier: Occupier,
            Property_Width: Property_Width,
            Property_Length: Property_Length,
            Property_tax: Property_Width * Property_Length * 6,
            Water_tax: Water_tax.toFixed(2) * 1,
            Drainage_tax: Drainage_tax.toFixed(2) * 1,
            SW_tax: SW_tax.toFixed(2) * 1,
            Rebate: Rebate.toFixed(2) * 1,
            Education_Cess: Education_Cess.toFixed(2) * 1,
            Total: Total.toFixed(0) * 1,
        }

        const Tenment = await TenamentDB.create(tenmentData);
        res.status(200).redirect('/admin/dashBoard');

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err
        });
    }
}

exports.Report = async (req, res) => {
    try {
        const tenmentDataLength = await TenamentDB.aggregate([
            {
                $group: {
                    _id: null,
                    numTenment: { $sum: 1 }
                }
            },
            {
                $project: { _id: 0 }
            }
        ]);
        const page = req.query.page * 1 || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const tenmentData = await TenamentDB.find().sort("tenament").select('-__v -_id -Property_Length -Property_Width').skip(skip).limit(limit).lean();

        const year = new Date().getFullYear();
        for (let i = 0; i < tenmentData.length; i++) {
            if (tenmentData[i].Status) {
                const paymentData = await paymentDB.find({ $and: [{ tenament: tenmentData[i].tenament, paymentYear: year }] }).select('-__v -_id -Status -tenament -Total');
                tenmentData[i]["Date"] = paymentData[0].Date;
                tenmentData[i]["Transcation_ID"] = paymentData[0].Transcation_ID;
                tenmentData[i]["Reference"] = paymentData[0].Reference;
                tenmentData[i]["Year"] = year;
            }
        }

        res.render('Report', { title: "Report", User: req.user, tenmentData: tenmentData, page: page, tenmentDataLength: tenmentDataLength[0].numTenment, limit: limit });

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err.message
        });
    }
}

exports.ReportDownload = async (req, res, next) => {
    try {
        const tenamentList = await TenamentDB.aggregate([
            {
                $group: {
                    _id: null,
                    tenment: { $push: '$tenament' }
                }
            },
            {
                $project: { _id: 0 }
            }
        ]);
        const list = tenamentList[0].tenment.sort();

        let Listdata = [];
        const year = new Date().getFullYear();
        for (let i = 0; i < list.length; i++) {
            const tenmentData = await TenamentDB.find({ tenament: list[i] }).select('-__v -_id -Property_Length -Property_Width');
            if (tenmentData[0].Status) {
                const paymentData = await paymentDB.findOne({ $and: [{ tenament: list[i], paymentYear: year }] }).select('-__v -_id -Status -tenament -Total');
                let obj = {};
                obj = { ...tenmentData[0] };
                if (paymentData) {
                    obj["Date"] = paymentData.Date;
                    obj["Transcation_ID"] = paymentData.Transcation_ID;
                    obj["Reference"] = paymentData.Reference;
                }
                obj["Year"] = year;
                Listdata.push(obj);
            } else {
                let obj = {};
                obj = { ...tenmentData[0] };
                obj["Year"] = year;
                Listdata.push(obj);
            }
        }

        // ! PDF generater
        const filename = 'Report' + '.pdf';

        fs.readFile(path.join(__dirname, './../../views/Report.html'), 'utf-8', async (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            const list = {
                Listdata: Listdata
            }
            var document = {
                html: data,
                data: {
                    list: list
                },
                path: './Download/' + filename,
                type: ""
            };

            // const PDF = await pdf.create(document, options);
            next();
        });
    } catch (err) {
        console.log("ERROR", err);
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err.message
        });
    }
}

exports.PandingBill = async (req, res) => {
    try {

    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err.message
        });
    }
}

exports.propertyRequest = async (req, res) => {
    try {
        const addPropertyList = await addPropertyDB.find().sort("tenment");
        const selllist = await sellDB.find().select("-photo -saleDead -propertyDocument -paymentStamp -__v").sort("tenment");

        let sellList = [];
        for (let i = 0; i < selllist.length; i++) {
            const sell = await sellDB.find({ tenment: selllist[i].tenment });
            const buy = await buyDB.find({ tenment: selllist[i].tenment });

            let obj = {};
            obj["tenment"] = sell[i].tenment || "";
            obj["sellId"] = sell[i]._id || "";
            obj["sellEmail"] = sell[i].email || "";
            obj["sellAadhar"] = sell[i].aadhar || "";
            obj["sellphoto"] = sell[i].photo || "";
            obj["sellSaleDead"] = sell[i].saleDead || "";
            obj["sellPropertyDocument"] = sell[i].propertyDocument || "";
            obj["sellPaymentStamp"] = sell[i].paymentStamp || "";

            obj["buyId"] = buy[i]._id || "";
            obj["buyEmail"] = buy[i].email || "";
            obj["buyAadhar"] = buy[i].aadhar || "";
            obj["buyPhoto"] = buy[i].photo || "";
            obj["buyOccupier"] = buy[i].Occupier || "";

            sellList.push(obj);
        }
        res.status(200).render('propertyRequest', { title: "Property Request", User: req.user, addPropertyList: addPropertyList, sellList: sellList, LOCAL_URL: LOCAL_URL });
    } catch (err) {
        res.status(500).json({
            message: 'Server down, try again after some time.',
            error: err.message
        });
    }
}
// res.render('serverError', { title: 'ServerError', message: "", status: 0 });
