const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public
app.use(express.static('public/css'));
app.use(express.static('public/images')); 
app.use(express.static('public/favicon'));

// Set up session
app.use(session({
    secret: 'lsinaaarnele',
    resave: true,
    saveUninitialized: true,
}));

// enforce session
const requireAuth = (req, res, next) => {
    if (!req.session.username) {
        res.redirect(302, '/?errorMessage=Please%20login%20to%20view%20this%20page');
    }
    next();
};
// app.use(['/dashboard', '/profile'], requireAuth);

// Global variable to store the database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dca-portal'
});

// login page route
app.get('/', (req, res) => {
    res.render('login', { errorMessage: '' });
});

// registration page route
app.get('/register', (req, res) => {
    res.render('registration', { errorMessage: '' });
});

// dashboard logic
const getServices = () => {
    const query = 'SELECT * FROM services';
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


// dashboard route
app.get('/dashboard', async (req, res) => {
    try {
        const services = await getServices();
        res.render('dashboard', { services });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).send('Internal Server Error');
    }
});


// login form handling
app.post('/', (req, res) => {
    const { email, password } = req.body;
    const authenticateUser = (email, password) => {
        const query = 'SELECT * FROM users WHERE email = ?';
        connection.query(query, [email], (err, results) => {
            if (err) {
                console.error('Error retrieving user:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            if (results.length > 0) {
                const user = results[0];
                const isPasswordValid = bcrypt.compareSync(password, user.password);
                if (user.status === 'active') {
                    if (isPasswordValid) {
                        app.get('/set-session', (req, res) => {
                            req.session.username = email;
                        });
                        res.redirect('/dashboard');
                    } else {
                        res.render('login', { errorMessage: 'Invalid username or password' });
                    }
                } else {
                    res.render('login', { errorMessage: 'Account email not verified' });
                }
            } else {
                res.render('login', { errorMessage: 'User not found' });
            }
        });
    };
    authenticateUser(email, password);
});

// registration form handling
app.post('/register', (req, res) => {
    const { username, email, password, confirm } = req.body;
    if (password !== confirm) {
        res.render('registration', { errorMessage: 'Passwords do not match' });
        return;
    }
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(confirm, saltRounds);

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            res.render('registration', { errorMessage: 'Server error! Contact Admin!' });
            return;
        }
        console.log('Connected to the database');
        defaultStatus = 'verify';
        const query = 'INSERT INTO users (username, email, password, status) VALUES (?, ?, ?, ?)';

        // does user exist?
        const checkUser = 'SELECT * FROM users WHERE email = ?';
        connection.query(checkUser, [email], (err, results) => {
            if (err) {
                console.error('Error retrieving user:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            if (results.length > 0) {
                res.render('registration', { errorMessage: 'User already exists' });
            } else {
                connection.query(query, [username, email, hashedPassword, defaultStatus], (err, results) => {
                    if (err) {
                        console.error('Error inserting user:', err);
                        return;
                    }
                    console.log('User inserted successfully');
                    const insertServices = 'INSERT INTO services (user_email, slack, DCA_drive, leads, hosting) VALUES (?, ?, ?, ?, ?)';
                    connection.query(insertServices, [email, '0', '0', '0', '0', '0', '0'], (err, results) => {
                        if (err) {
                            console.error('Error inserting services:', err);
                            return;
                        }
                        console.log('Services inserted successfully');
                    });
                    // Generate a verification token and email it
                    const verificationToken = (Math.floor(100000 + Math.random() * 900000));
                    // insert code into db
                    const query = 'INSERT INTO tokens (user_email, token_value) VALUES (?, ?)';
                    connection.query(query, [email, verificationToken], (err, results) => {
                        if (err) {
                            console.error('Error inserting token:', err);
                            return;
                        }
                        console.log('Token inserted successfully');
                    });
                    sendVerificationEmail(email, verificationToken);
        
                    // Redirect to login page after registration
                    res.render('login', { errorMessage: 'Registration Successful. Please check your email.' });
                });
            }
        });
    });
});

// Emailing
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
        html: `<p>Click the following link to verify your email: <a href="http://portal.dotconnectafrica.org/login/${verificationToken}">Verify Email</a></p>`,
        // for testing environment
        html: `<p>Click the following link to verify your email: <a href="http://localhost:3000//${verificationToken}">Verify Email</a></p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};


// email verification
app.get('//:token', (req, res) => {
    const verificationToken = req.params.token;
    const query = 'SELECT * FROM tokens WHERE token_value = ?';
    connection.query(query, [verificationToken], (err, results) => {
        if (err) {
            console.error('Error retrieving user:', err);
            return;
            res.redirect('/');
        }

        if (results.length > 0) {
            const user = results[0];
            const query = 'UPDATE users SET status = ? WHERE email = ?';
            connection.query(query, ['active', user.user_email], (err, results) => {
                if (err) {
                    console.error('Error updating user:', err);
                    return;
                    res.redirect('/');
                }
                const removetoken = 'DELETE FROM tokens WHERE token_value = ?';
                connection.query(removetoken, [verificationToken], (err, results) => {
                    if (err) {
                        console.error('Error deleting token:', err);
                        return;
                        res.redirect('/');
                    }
                    console.log('Token deleted successfully');
                });
            });
        } else {
            res.redirect('/register');
        }
    });
    res.redirect('/');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
