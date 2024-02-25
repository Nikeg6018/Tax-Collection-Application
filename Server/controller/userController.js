var randomstring = require("randomstring");
var { UserDB, TenamentDB, paymentDB, PandingTenamentDB, addPropertyDB, TempUserDB, sellDB, buyDB } = require('./../model/model');
const fs = require('fs');
const pdf = require('pdf-creator-node');
const path = require('path');
const options = require('./../../assets/js/options');
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
const multer = require('multer');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: `${__dirname}/../../config.env` });

const stripe = require("stripe")(process.env.SECRET_KEY);

const LOCAL_URL = 'http://localhost:4000';
// const LOCAL_URL = 'https://tax-collection.onrender.com';

const EMAIL = process.env.EMAIL;
const PASS = process.env.PASS;

exports.SignUpOTP = async (req, res) => {
    // validate request
    if (JSON.stringify(req.body) === '{}') {
        res.status(400).render('sign_Up', { title: "Sign Up", alert: false, submit: false, action: '/user/api/SignUpOTP', OTPalert: false });
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
                    intro: 'You have received this email because a Sign up detailes is correct.',
                    dictionary: {
                        instructions: `Your One-Time-password (OTP) : ${OTPNumber}`
                    },
                    outro: 'Please sure enter the right OTP.'
                }
            };

            let mail = MailGenerator.generate(response);

            let message = {
                from: EMAIL,
                to: req.body.email,
                subject: "OTP for sign UP.",
                html: mail
            }

            // await transporter.sendMail(message);
            req.body.OTP = OTPNumber;
            const TempUser = await TempUserDB.create(req.body);

            res.status(300).redirect(`/user/SignUpOTP/${TempUser._id.valueOf()}`);
        }
        catch (err) {
            res.status(500).send({
                message: err.message || "Some error occured while sending the email, please sign up again."
            });
        }
    }
    else {
        res.status(500).render('sign_Up', { title: "Sign Up", user: req.body, alert: true, submit: false, action: '/user/api/SignUpOTP', OTPalert: false });
    }
}

exports.verifyOTP = async (req, res) => {
    try {
        const tempuser = await TempUserDB.findById(req.params.id);
        res.status(200).render('sign_Up', { title: "Sign Up", user: tempuser, alert: false, submit: true, action: '/user/api/signUp', OTPalert: false });
    } catch (err) {
        res.status(500).json({
            status: 'Fail',
            message: 'Server down, try again after some time.'
        });
    }
}

exports.create = async (req, res) => {

    try {
        const tempuserData = await TempUserDB.findById(req.body.id);
        const OTP = req.body.OTP;
        if (OTP == tempuserData.OTP) {
            try {
                const user = await UserDB.create(req.body);
                await TempUserDB.findByIdAndDelete(req.body.id);
                res.status(300).redirect('/user/login');
            }
            catch (err) {
                res.status(500).send({
                    message: err.message || "Server down, try again after some time."
                });
            }
        }
        else {
            res.status(500).render('sign_Up', { title: "Sign Up", user: req.body, alert: true, submit: true, action: '/user/api/signUp', OTPalert: true });
        }

    } catch (err) {
        await TempUserDB.findByIdAndDelete(req.body.id);
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
        const data = await UserDB.find({ $and: [{ email: req.body.email }, { password: req.body.password }] });
        if (data.length == 0) {
            res.status(500).render('login', { title: "Login", alert: true });
        } else {
            const token = signToken(data[0]._id.valueOf());
            const cookieOption = {
                expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
                // httpOnly: true
            }
            res.cookie('jwt', token, cookieOption);
            setTimeout(() => {
                res.status(200).redirect(`/user/BillDashbord`);
            }, 2000);
        }
    } catch (err) {
        res.status(500).json({
            status: "Fail",
            message: "Server down, try again after some time."
        });
    }
}

// session was destroy
exports.exit = async (req, res) => {
    const cookieOption = {
        expires: new Date(Date.now()),
        httpOnly: true
    }
    res.cookie('jwt', '', cookieOption);
    res.status(204).redirect('/');
}

exports.billboard = async (req, res) => {
    try {
        const Tenmentdata = [];
        const Paymentdata = [];
        const year = new Date().getFullYear();

        let userData = await UserDB.findById(req.user._id);
        let sortedTenment = userData.tenment.sort();
        userData.tenment = sortedTenment;


        let Total = 0;
        let tenmentString = "";
        for (var i = 0; i < userData.tenment.length; i++) {
            let Tenament = await TenamentDB.find({ tenament: userData.tenment[i] });
            if (Tenament[0].Status == false)
                Total += Tenament[0].Total;
            Tenmentdata.push(Tenament);

            let Payment = await paymentDB.find({ $and: [{ tenament: userData.tenment[i] }, { paymentYear: year }] })
            if (Payment[0] != undefined) {
                tenmentString += Payment[0].tenament + ",";
                Paymentdata.push(Payment);
            }
        }

        res.status(200).render('bills', { title: "Bill Dashboard", User: userData, Tenment: Tenmentdata, Payment: Paymentdata, year: year, TotalPay: Total, tenmentString: tenmentString });
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.billDetails = async (req, res) => {
    try {
        const data = await TenamentDB.find({ tenament: req.params.tenment });
        res.status(200).render('taxPage', { title: "Tex Page", User: req.user, Tenment: data, PUBLISHABLE_KEY: process.env.PUBLISHABLE_KEY });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: "Server down, try again after some time."
        });
    }
}

exports.payment = async (req, res) => {
    try {
        const Transcation_ID = randomstring.generate({ length: 18, readable: true, charset: 'numeric' });
        const Reference = randomstring.generate({ length: 10, readable: true, charset: 'alphanumeric', capitalization: 'uppercase' });
        const { product } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `Owner: ${req.user.name}`,
                            description: `Address: ${product.name}
                                          Tenament: ${product.description}
                                          Transcation ID: ${Transcation_ID}
                                          Reference: ${Reference}`
                        },
                        unit_amount: product.amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${LOCAL_URL}/user/paymentSuccess/${req.params.id}/${Transcation_ID}/${Reference}`,
            cancel_url: `${LOCAL_URL}/user/cancel`,
        });
        res.status(200).json({ id: session.id });
    } catch (err) {
        res.status(500).json({
            status: "Fail to payment",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.PaymentMail = async (req, res) => {

    try {
        const tenmentData = await TenamentDB.findById(req.params.id);
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
        })

        let response = {
            body: {
                name: `Your bill payed ${tenmentData.tenament}`,
                intro: "Your bill has arrived!",
                table: [
                    {
                        title: "Property Detailes",
                        data: [
                            {
                                item: "Tenament",
                                description: `${tenmentData.tenament}`,
                            },
                            {
                                item: "Taluka",
                                description: `${tenmentData.Taluka}`,
                            },
                            {
                                item: "Name",
                                description: `${tenmentData.Name}`,
                            },
                            {
                                item: "Postal Address",
                                description: `${tenmentData.Postal_address}`,
                            },
                            {
                                item: "Local Address",
                                description: `${tenmentData.Local_address}`,
                            },
                            {
                                item: "Usage",
                                description: `${tenmentData.Usage}`,
                            },
                            {
                                item: "Occupier",
                                description: `${tenmentData.Occupier}`,
                            }
                        ]
                    },
                    {
                        title: "Tax Details",
                        data: [
                            {
                                item: "Property Tax",
                                price: `${tenmentData.Property_tax}`,
                            },
                            {
                                item: "Water Tax",
                                price: `${tenmentData.Water_tax}`,
                            },
                            {
                                item: "Drainage Tax",
                                price: `${tenmentData.Drainage_tax}`,
                            },
                            {
                                item: "SW Tax",
                                price: `${tenmentData.SW_tax}`,
                            },
                            {
                                item: "Street Light Tax",
                                price: `${tenmentData.Street_Light}`,
                            },
                            {
                                item: "Fire Charge",
                                price: `${tenmentData.Fire_Charge}`,
                            },
                            {
                                item: "Env Improve Charge",
                                price: `${tenmentData.Env_improve_charge}`,
                            },
                            {
                                item: "Rebate",
                                price: `${tenmentData.Rebate}`,
                            },
                            {
                                item: "Education Cess",
                                price: `${tenmentData.Education_Cess}`,
                            },
                            {
                                item: "Total",
                                price: `${tenmentData.Total}`,
                            }
                        ]
                    },
                    {
                        title: "Payment Details",
                        data: [
                            {
                                item: "Transcation ID",
                                description: `${req.params.Transcation_ID}`,
                            },
                            {
                                item: "Reference",
                                description: `${req.params.Reference}`,
                            }
                        ]
                    }
                ],
                action: {
                    instructions: 'To Download the Payment Receipe, please click here:',
                    button: {
                        color: '#48cfad', // Optional action button color
                        text: `Download Receipe`,
                        link: `${LOCAL_URL}/Download/${req.params.id}`
                    }
                },
                outro: "Thank you for payment"
            }
        }

        let mail = MailGenerator.generate(response);

        let message = {
            from: EMAIL,
            to: req.user.email,
            subject: "Your tax payment is successfully pay.",
            html: mail
        }

        // await transporter.sendMail(message);

        res.status(300).redirect(`/user/success/${req.params.Transcation_ID}/${req.params.Reference}`);
    } catch (err) {
        res.status(500).json({
            status: "Fail to send mail",
            message: err || "Some error occured while sending the email, please sign up again."
        });
    }
}

exports.success = async (req, res) => {
    try {
        const TanmentData = await TenamentDB.findById(req.params.id);

        const paymentData = {
            tenament: TanmentData.tenament,
            taluka: TanmentData.Taluka,
            Status: true,
            Total: TanmentData.Total,
            paymentYear: `${new Date().getFullYear()}`,
            Date: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}  ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`,
            Transcation_ID: req.params.Transcation_ID,
            Reference: req.params.Reference
        }
        await paymentDB.create(paymentData);

        const updateData = {
            Status: true
        }
        const ten = await TenamentDB.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        // ! PDF generater
        const filename = TanmentData.tenament + '_Payment' + '.pdf';

        var year = new Date().getFullYear();
        fs.readFile(path.join(__dirname, './../../views/template.html'), 'utf-8', async (err, data) => {
            if (err) {
                console.log(err);
                return;
            }

            var document = {
                html: data,
                data: {
                    tenament: TanmentData.tenament,
                    Total: TanmentData.Total,
                    Name: TanmentData.Name,
                    Postal_address: TanmentData.Postal_address,
                    Local_address: TanmentData.Local_address,
                    Usage: TanmentData.Usage,
                    Occupier: TanmentData.Occupier,
                    Last_Bill_Issue_Date: `1/10/${year}`,
                    Last_Bill_Due_Date: `31/12/${year}`,
                    Property_tax: TanmentData.Property_tax,
                    Water_tax: TanmentData.Water_tax,
                    Drainage_tax: TanmentData.Drainage_tax,
                    SW_tax: TanmentData.SW_tax,
                    Street_Light: TanmentData.Street_Light,
                    Fire_Charge: TanmentData.Fire_Charge,
                    Env_improve_charge: TanmentData.Env_improve_charge,
                    Rebate: TanmentData.Rebate,
                    Education_Cess: TanmentData.Education_Cess,
                    Total: TanmentData.Total,
                    Date: paymentData.Date,
                    Transcation_ID: paymentData.Transcation_ID,
                    Reference: paymentData.Reference
                },
                path: './Download/' + filename,
                type: ""
            };

            res.render('mail', { title: "Payment Success", TransactionDetails: req.params, singlePayment: true });

            // const PDF = await pdf.create(document, options);

        });
    } catch (err) {
        res.status(504).json({
            status: "Fail to payment",
            message: err || "Server down, try again after some time."
        });
    }
}


exports.allBillDetails = async (req, res) => {
    try {
        const tenmentData = [];
        const tanment = req.user.tenment.sort();

        let tanmentTotal = {
            Property_tax: 0,
            Water_tax: 0,
            Drainage_tax: 0,
            SW_tax: 0,
            Street_Light: 0,
            Fire_Charge: 0,
            Env_improve_charge: 0,
            Rebate: 0,
            Education_Cess: 0,
            Total: 0
        }

        let tenmentString = "";
        for (let i = 0; i < tanment.length; i++) {
            let data = await TenamentDB.find({ $and: [{ tenament: tanment[i] }, { Status: false }] });
            if (data[0]) {
                tenmentString += data[0].tenament;
                if (i < tanment.length - 1) {
                    tenmentString += ",";
                }
                tanmentTotal.Property_tax += data[0].Property_tax;
                tanmentTotal.Water_tax += data[0].Water_tax;
                tanmentTotal.Drainage_tax += data[0].Drainage_tax;
                tanmentTotal.SW_tax += data[0].SW_tax;
                tanmentTotal.Street_Light += data[0].Street_Light;
                tanmentTotal.Fire_Charge += data[0].Fire_Charge;
                tanmentTotal.Env_improve_charge += data[0].Env_improve_charge;
                tanmentTotal.Rebate += data[0].Rebate;
                tanmentTotal.Education_Cess += data[0].Education_Cess;
                tanmentTotal.Total += data[0].Total;

                tenmentData.push(data[0]);
            }
        }
        res.status(200).render('taxAllPage', { title: "All Tax Page", User: req.user, tenmentData: tenmentData, tanmentTotal: tanmentTotal, tenmentString: tenmentString, PUBLISHABLE_KEY: process.env.PUBLISHABLE_KEY });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            error: err || "Server down, try again after some time."
        });
    }
}

exports.paymentAllBill = async (req, res) => {
    try {
        const Transcation_ID = randomstring.generate({ length: 18, readable: true, charset: 'numeric' });
        const Reference = randomstring.generate({ length: 10, readable: true, charset: 'alphanumeric', capitalization: 'uppercase' });
        const { product } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `Owner: ${req.user.name}`,
                            description: `Tenament: ${product.description}
                                          Transcation ID: ${Transcation_ID}
                                          Reference: ${Reference}`
                        },
                        unit_amount: product.amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${LOCAL_URL}/user/paymentSuccess/${Transcation_ID}/${Reference}?tenament=${product.description}`,
            cancel_url: `${LOCAL_URL}/user/cancel`,
        });
        res.status(200).json({ id: session.id });

    } catch (err) {
        res.status(500).json({
            status: "Fail to payment",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.successAll = async (req, res) => {
    try {
        const tenment = req.query.tenament.split(',');
        for (let i = 0; i < tenment.length; i++) {
            const TanmentData = await TenamentDB.find({ tenament: tenment[i] });
            const paymentData = {
                tenament: TanmentData[0].tenament,
                Status: true,
                Total: TanmentData[0].Total,
                paymentYear: `${new Date().getFullYear()}`,
                Date: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}  ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`,
                Transcation_ID: req.params.Transcation_ID,
                Reference: req.params.Reference
            }
            const payment = await paymentDB.create(paymentData);

            const updateData = {
                Status: true
            }
            const ten = await TenamentDB.findByIdAndUpdate(TanmentData[0]._id.valueOf(), updateData, {
                new: true,
                runValidators: true
            });

            // ! PDF generater
            const filename = TanmentData[0].tenament + '_Payment' + '.pdf';

            var year = new Date().getFullYear();
            fs.readFile(path.join(__dirname, './../../views/template.html'), 'utf-8', async (err, data) => {
                if (err) {
                    console.log(err);
                    return;
                }

                var document = {
                    html: data,
                    data: {
                        tenament: TanmentData[0].tenament,
                        Total: TanmentData[0].Total,
                        Name: TanmentData[0].Name,
                        Postal_address: TanmentData[0].Postal_address,
                        Local_address: TanmentData[0].Local_address,
                        Usage: TanmentData[0].Usage,
                        Occupier: TanmentData[0].Occupier,
                        Last_Bill_Issue_Date: `1/10/${year}`,
                        Last_Bill_Due_Date: `31/12/${year}`,
                        Property_tax: TanmentData[0].Property_tax,
                        Water_tax: TanmentData[0].Water_tax,
                        Drainage_tax: TanmentData[0].Drainage_tax,
                        SW_tax: TanmentData[0].SW_tax,
                        Street_Light: TanmentData[0].Street_Light,
                        Fire_Charge: TanmentData[0].Fire_Charge,
                        Env_improve_charge: TanmentData[0].Env_improve_charge,
                        Rebate: TanmentData[0].Rebate,
                        Education_Cess: TanmentData[0].Education_Cess,
                        Total: TanmentData[0].Total,
                        Date: paymentData.Date,
                        Transcation_ID: paymentData.Transcation_ID,
                        Reference: paymentData.Reference
                    },
                    path: './Download/' + filename,
                    type: ""
                };
                const PDF = await pdf.create(document, options);
            });

        }

        res.render('mail', { title: "Payment Success", TransactionDetails: req.params, singlePayment: false, tenament: req.query.tenament });
    } catch (err) {
        res.status(504).json({
            status: "Fail to payment",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.AllPaymentMail = async (req, res) => {

    try {
        const tenment = req.query.tenament.split(',');
        for (let i = 0; i < tenment.length; i++) {
            let tenmentData = await TenamentDB.find({ tenament: tenment[i] });
            tenmentData = tenmentData[0];
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
            })

            let response = {
                body: {
                    name: `Your bill payed ${tenmentData.tenament}`,
                    intro: "Your bill has arrived!",
                    table: [
                        {
                            title: "Property Detailes",
                            data: [
                                {
                                    item: "Tenament",
                                    description: `${tenmentData.tenament}`,
                                },
                                {
                                    item: "Taluka",
                                    description: `${tenmentData.Taluka}`,
                                },
                                {
                                    item: "Name",
                                    description: `${tenmentData.Name}`,
                                },
                                {
                                    item: "Postal Address",
                                    description: `${tenmentData.Postal_address}`,
                                },
                                {
                                    item: "Local Address",
                                    description: `${tenmentData.Local_address}`,
                                },
                                {
                                    item: "Usage",
                                    description: `${tenmentData.Usage}`,
                                },
                                {
                                    item: "Occupier",
                                    description: `${tenmentData.Occupier}`,
                                }
                            ]
                        },
                        {
                            title: "Tax Details",
                            data: [
                                {
                                    item: "Property Tax",
                                    price: `${tenmentData.Property_tax}`,
                                },
                                {
                                    item: "Water Tax",
                                    price: `${tenmentData.Water_tax}`,
                                },
                                {
                                    item: "Drainage Tax",
                                    price: `${tenmentData.Drainage_tax}`,
                                },
                                {
                                    item: "SW Tax",
                                    price: `${tenmentData.SW_tax}`,
                                },
                                {
                                    item: "Street Light Tax",
                                    price: `${tenmentData.Street_Light}`,
                                },
                                {
                                    item: "Fire Charge",
                                    price: `${tenmentData.Fire_Charge}`,
                                },
                                {
                                    item: "Env Improve Charge",
                                    price: `${tenmentData.Env_improve_charge}`,
                                },
                                {
                                    item: "Rebate",
                                    price: `${tenmentData.Rebate}`,
                                },
                                {
                                    item: "Education Cess",
                                    price: `${tenmentData.Education_Cess}`,
                                },
                                {
                                    item: "Total",
                                    price: `${tenmentData.Total}`,
                                }
                            ]
                        },
                        {
                            title: "Payment Details",
                            data: [
                                {
                                    item: "Transcation ID",
                                    description: `${req.params.Transcation_ID}`,
                                },
                                {
                                    item: "Reference",
                                    description: `${req.params.Reference}`,
                                }
                            ]
                        }
                    ],
                    action: {
                        instructions: 'To Download the Payment Receipe, please click here:',
                        button: {
                            color: '#48cfad', // Optional action button color
                            text: `Download Receipe`,
                            link: `${LOCAL_URL}/Download/${tenmentData._id.valueOf()}`
                        }
                    },
                    outro: "Thank you for payment"
                }
            }

            let mail = MailGenerator.generate(response);

            let message = {
                from: EMAIL,
                to: req.user.email,
                subject: "Your tax payment is successfully pay.",
                html: mail
            }

            // await transporter.sendMail(message);
        }

        res.status(300).redirect(`/user/success/${req.params.Transcation_ID}/${req.params.Reference}`);
    } catch (err) {
        res.status(500).json({
            status: "Fail to send mail",
            message: err || "Server down, try again after some time."
        });
    }
}

exports.downloadReceipe = async (req, res) => {
    try {
        var year = new Date().getFullYear();
        var Tenment = await TenamentDB.find({ tenament: req.params.id });
        var Payment = await paymentDB.find({ $and: [{ tenament: req.params.id }, { paymentYear: year }] });

        res.status(200).render('template.ejs', { title: "Bill Recipe", User: req.user, Tenment: Tenment[0], Payment: Payment[0], year: year, withLogin: true });
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err || "Server down, try again after some time."
        });
    }
}


exports.userProfile = async (req, res) => {
    try {
        const id = req.user._id;

        var data = await UserDB.findById(id);
        res.status(200).render('userPage', { title: "User Details", User: data });

    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.userEdit = async (req, res) => {
    try {
        const id = req.user._id;

        const data = await UserDB.findById(id);
        res.status(200).render('userEditPage', { title: "User Details Edit", User: data });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.userEditSubmit = async (req, res) => {
    try {
        const id = req.user._id;
        const data = {
            name: req.body.name,
            email: req.body.email,
            number: req.body.number,
            code: req.body.code,
            password: req.body.password
        }

        const update = await UserDB.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });

        res.status(300).redirect(`/user/BillDashbord/userProfile`);
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.forgot = async (req, res) => {
    try {
        const userData = await UserDB.find(req.body);

        if (userData.length) {
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
                    name: `${userData[0].name}`,
                    intro: 'Because your account requested a password reset, you have got this email.',
                    action: {
                        instructions: 'Click the button below to reset your password:',
                        button: {
                            color: '#ed3266', // Optional action button color
                            text: 'Reset your password',
                            link: `${LOCAL_URL}/user/forgot/${userData[0]._id.valueOf()}`
                        }
                    },
                    outro: 'No more action is necessary on your behalf if you did not request a password reset.'
                }
            };

            let mail = MailGenerator.generate(response);

            let message = {
                from: EMAIL,
                to: userData[0].email,
                subject: "Forgot your password.",
                html: mail
            }

            // await transporter.sendMail(message);
            res.status(200).render('forgot', { title: 'Forgot Page', UserForgot: true, send: true, alert: false });
        } else {
            res.status(200).render('forgot', { title: 'Forgot Page', UserForgot: true, send: false, alert: true });
        }

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Fail to send forgot password mail.',
        });
    }
}

exports.passwordEdit = async (req, res) => {
    try {
        const id = req.params.id;
        res.status(200).render('passwordPage', { title: "User Details Edit", id: id, UserForgot: true, alert: false });
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

            const update = await UserDB.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });

            res.status(300).redirect(`/user/login`);
        } else {
            const UserForgot = req.params.UserForgot * 1;
            res.status(200).render('passwordPage', { title: "User Details Edit", id: id, UserForgot: true, alert: true });
        }

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Server down, try again after some time.',
        });
    }
}

exports.addProperty = async (req, res) => {
    try {
        const RequestedList = await addPropertyDB.find({ email: req.user.email });
        res.status(200).render('addProperty', { title: "Property Request", User: req.user, list: RequestedList });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}

exports.addPropertyRequest = async (req, res) => {
    try {

        const obj = {
            email: req.user.email,
            aadhar: req.body.aadharNumber,
            tenment: req.body.propertyNumber,
            photo: req.body.files[0],
            propertyDocument: req.body.files[1],
        }

        await addPropertyDB.create(obj);

        res.status(200).redirect(`/user/BillDashboard/upload`);
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}

exports.sellProperty = async (req, res) => {
    try {
        const sellProperty = await sellDB.find({ email: req.user.email });
        res.status(200).render('sell', { title: "Sell Property Request", User: req.user, list: sellProperty });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}

exports.sellPropertyRequest = async (req, res) => {
    try {
        const obj = {
            email: req.user.email,
            aadhar: req.body.aadharNumber,
            tenment: req.body.propertyNumber,
            photo: req.body.files[0],
            saleDead: req.body.files[1],
            propertyDocument: req.body.files[2],
            paymentStamp: req.body.files[3],

        }
        await sellDB.create(obj);

        res.status(200).redirect(`/user/BillDashboard/sell`);
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}

exports.buyProperty = async (req, res) => {
    try {
        const buyProperty = await buyDB.find({ email: req.user.email });
        res.status(200).render('buy', { title: "Buy Property Request", User: req.user, list: buyProperty });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}

exports.buyPropertyRequest = async (req, res) => {
    try {

        const obj = {
            email: req.user.email,
            aadhar: req.body.aadharNumber,
            tenment: req.body.propertyNumber,
            photo: req.body.files[0],
            Occupier: req.body.post
        }
        await buyDB.create(obj);

        res.status(200).redirect(`/user/BillDashboard/buy`);
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message || 'Details not updated successfully, So try again.',
        });
    }
}
