const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const { UserDB, AdminDB } = require('./../model/model');

exports.protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startswith('Bearer')) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            res.status(401).json({
                status: 'fail',
                message: 'You are not logged in. Please log in again'
            });
            return;
        }

        const decodes = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        const currentUser = await UserDB.findById(decodes.id);

        if (!currentUser) {
            res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token does no longer exist.'
            });
            return;
        }

        req.user = currentUser;
        next();

    } catch (err) {
        res.status(500).json({
            status: 'fail',
            message: 'Server ERROR.'
        });
    }
}

exports.isLoggedIn = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startswith('Bearer')) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            res.status(401).json({
                status: 'fail',
                message: 'You are not logged in. Please log in again'
            });
            return;
        }

        const decodes = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        const currentUser = await AdminDB.findById(decodes.id);

        if (!currentUser) {
            res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token does no longer exist.'
            });
            return;
        }

        req.user = currentUser;
        next();

    } catch (err) {
        res.status(500).json({
            status: 'fail',
            message: 'Server ERROR.'
        });
    }
}