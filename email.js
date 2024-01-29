const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'leviskibet2002@gmail.com',
        pass: 'ykns mnlz ypnl zrpv'
    }
});

const sendVerificationEmail = (to, verificationToken) => {
    const mailOptions = {
        from: 'leviskibet2002@gmail.com',
        to,
        subject: 'Email Verification',
        // html: `<p>Click the following link to verify your email: <a href="http://portal.dotconnectafrica.org/verify/${verificationToken}">Verify Email</a></p>`
        // for testing environment
        html: `<p>Click the following link to verify your email: <a href="http://localhost:3000/verify/${verificationToken}">Verify Email</a></p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = { sendVerificationEmail };
