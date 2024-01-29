const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

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

// export functions
module.exports = {
    authenticateUser
};