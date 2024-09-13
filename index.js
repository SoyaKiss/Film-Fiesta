require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const passport = require('passport');
const Models = require('./models.js');
let cors = require("cors");

const app = express();
const Movies = Models.Movie;
const Users = Models.User;

const secretKey = 'your_secret_key';
const refreshTokenSecret = 'your_refresh_token_secret';
const tokenExpiration = '1h';
const refreshTokenExpiration = '7d';

let refreshTokens = [];

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// NEW CODE:
let allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:1234',
  'https://film-fiesta-marvel-movies.netlify.app',
  'http://localhost:4200' // Add your Angular frontend URL here
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // Optional: allows cookies if needed
}));

// Handle preflight requests explicitly
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  }
}));

app.use(bodyParser.json({ strict: false })); // Ensure body-parser is correctly set up
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    res.status(400).send({ message: 'Invalid JSON payload' });
  } else {
    next();
  }
});


require('./auth.js')(app);




// Function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(user, secretKey, { expiresIn: tokenExpiration });
  const refreshToken = jwt.sign(user, refreshTokenSecret, { expiresIn: refreshTokenExpiration });
  return { accessToken, refreshToken };
};


// NEW CODE TO CREATE A NEW USER:
// POST - Create new user
app.post(
  '/users',
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.Password, 10);

      // Check if the user already exists
      const existingUser = await Users.findOne({ Username: req.body.Username });
      if (existingUser) {
        return res.status(400).json({ message: `${req.body.Username} already exists` });
      }

      // Create a new user
      const newUser = new Users({
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        fullName: req.body.fullName,
        Birthday: req.body.Birthday,
      });

      // Save the user to MongoDB
      await newUser.save(); // Explicitly save the user and catch errors if any

      // Generate JWT token for the new user
      const token = jwt.sign({ id: newUser._id, username: newUser.Username }, secretKey, { expiresIn: '1h' });

      // Send the response with the created user and token
      res.status(201).json({
        user: {
          _id: newUser._id,
          Username: newUser.Username,
          Email: newUser.Email,
          fullName: newUser.fullName,
          favoriteMovies: newUser.favoriteMovies,
        },
        token,
      });
    } catch (error) {
      // Log any errors that occur during the user creation process
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal Server Error: ' + error.message });
    }
  }
);

// GET - Get a user's information
app.get(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username } = req.params;
      const user = await Users.findOne({ Username });
      if (!user) {
        return res.status(404).send("User not found.");
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send("Internal Server Error: " + error.message);
    }
  }
);



// GET: Get a list of movies
app.get(
  '/movies',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const movies = await Movies.find();
      res.status(200).json(movies);
    } catch (error) {
      console.error('Error fetching movies:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  }
);


// POST - login
app.post('/login', async (req, res) => {
  const { Username, Password } = req.body;
  try {
    const user = await Users.findOne({ Username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(Password, user.Password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.Username }, secretKey, { expiresIn: '1h' });

    res.status(200).json({
      user: {
        _id: user._id,
        Username: user.Username,
        Email: user.Email,
        fullName: user.fullName,
        favoriteMovies: user.favoriteMovies,
      },
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
});


// Refresh token endpoint
app.post('/token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).send('Unauthorized');
  }
  if (!refreshTokens.includes(token)) {
    return res.status(403).send('Forbidden');
  }

  try {
    jwt.verify(token, refreshTokenSecret, (err, user) => {
      if (err) {
        return res.status(403).send('Forbidden');
      }
      const newTokens = generateTokens({ id: user.id, username: user.username });
      refreshTokens = refreshTokens.filter(t => t !== token);
      refreshTokens.push(newTokens.refreshToken);
      res.json(newTokens);
    });
  } catch (error) {
    console.error('Error during token refresh:', error);
    res.status(500).send('Internal Server Error');
  }
});


// PUT - Update User Info
app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send("Permission denied");
    }

    const updates = {
      Username: req.body.Username,
      Email: req.body.Email,
      fullName: req.body.fullName,
      Birthday: req.body.Birthday,
    };

    // Hash the password if it's being updated
    if (req.body.Password) {
      updates.Password = await bcrypt.hash(req.body.Password, 10);
    }

    try {
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username },
        { $set: updates },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).send("User not found.");
      }

      // Generate a new token if the password is updated
      const token = jwt.sign(
        { id: updatedUser._id, username: updatedUser.Username },
        secretKey,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        user: {
          _id: updatedUser._id,
          Username: updatedUser.Username,
          Email: updatedUser.Email,
          fullName: updatedUser.fullName,
          Birthday: updatedUser.Birthday,
          favoriteMovies: updatedUser.favoriteMovies,
        },
        token, // Include the new token
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error: " + err);
    }
  }
);


// DELETE - Allow user to deregister
app.delete(
  "/Users/:Username", // Ensure consistency in casing for the endpoint
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username } = req.params;
      const user = await Users.findOneAndDelete({ Username });

      if (user) {
        res.status(200).json({ message: `${user.Username} has been deleted.` }); // Return JSON response
      } else {
        res.status(404).json({ message: "User not found." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
  }
);


// POST - Add a movie to the user's favorites
app.post(
  "/Users/:Username/favorites/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username, MovieID } = req.params;
      const user = await Users.findOneAndUpdate(
        { Username },
        { $addToSet: { favoriteMovies: MovieID } },
        { new: true }
      );

      if (!user) {
        return res.status(400).send("User does not exist.");
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);


// GET - Get a user's fav movies
app.get(
  "/Users/:Username/favorites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username } = req.params;
      const user = await Users.findOne({ Username }).populate("favoriteMovies");

      if (!user) {
        return res.status(400).send("No such user.");
      }

      res.json(user.favoriteMovies);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);


// DELETE - Remove a movie from user's fav list
app.delete(
  "/Users/:Username/favorites/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username, MovieID } = req.params;
      const user = await Users.findOneAndUpdate(
        { Username },
        { $pull: { favoriteMovies: MovieID } },
        { new: true }
      );

      if (!user) {
        return res.status(400).send("No such user.");
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);


// NEW END POINT TO ADD FOR FAVORITE MOVIES 
// POST - Get movie details for a list of IDs
app.post(
  '/movies/details',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { movieIds } = req.body; // Expecting an array of movie IDs from the request body

    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).send('Invalid request. Provide an array of movie IDs.');
    }

    try {
      // Fetch movies that match the provided IDs
      const movies = await Movies.find({ _id: { $in: movieIds } });

      if (!movies || movies.length === 0) {
        return res.status(404).send('Movies not found.');
      }

      res.status(200).json(movies);
    } catch (error) {
      console.error('Error fetching movie details:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  }
);

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});

