var { UserDB, TenamentDB, } = require('./../Server/model/model');
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../config.env` });

// const LOCAL_URL = 'http://localhost:4000';
const LOCAL_URL = 'https://tax-collection.onrender.com';

const EMAIL = process.env.EMAIL;
const PASS = process.env.PASS;

mongoose.set('strictQuery', false);
const DB = process.env.DATABASE_URL.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

const connectDB = async () => {
    try {
        const con = await mongoose.connect(DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB connected : Connected`);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

connectDB();

(async () => {
    try {

        const user = await UserDB.aggregate([
            {
                $unwind: "$tenment"
            },
            {
                $group: {
                    _id: '$tenment',
                    email: { $first: '$email' }
                }
            }
        ]);

        for (let i = 0; i < user.length; i++) {
            const tenment = await TenamentDB.find({ tenament: user[i]._id }).select('-__v -Property_Length -Property_Width -_id').lean();
            const tenmentData = { ...tenment[0] };

            if (!tenmentData.Status) {
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
                        name: "Tax Payment",
                        link: `${LOCAL_URL}`,
                        copyright: 'Copyright © 2019. All rights reserved.'
                    }
                })

                let response = {
                    body: {
                        name: `Your bill pay ${tenmentData.tenament}`,
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
                            }
                        ],
                        outro: "Payment panding"
                    }
                }

                let mail = MailGenerator.generate(response);

                let message = {
                    from: EMAIL,
                    to: user[i].email,
                    subject: "Your tax payment is Panding.",
                    html: mail
                }

                // await transporter.sendMail(message);
            }
        }

    } catch (err) {
        console.log(err);
    }
    process.exit();
})();