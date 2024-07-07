const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const passport = require('passport');
const Models = require('./models.js');

const app = express();
const Movies = Models.Movie;
const Users = Models.User;

const secretKey = 'your_secret_key';

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

app.use(bodyParser.json());

const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://film-fiesta-marvel-movies.netlify.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

require('./auth.js')(app);

// POST - Create new user
app.post(
  '/users',
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const hashedPassword = await bcrypt.hash(req.body.Password, 10);
    try {
      const existingUser = await Users.findOne({ Username: req.body.Username });
      if (existingUser) {
        return res.status(400).json({ message: `${req.body.Username} already exists` });
      }
      const newUser = await Users.create({
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        fullName: req.body.fullName,
        Birthday: req.body.Birthday,
      });

      const token = jwt.sign({ id: newUser._id, username: newUser.Username }, secretKey, { expiresIn: '1h' });

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
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal Server Error: ' + error.message });
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

    // Only hash the password if it's being updated
    if (req.body.Password) {
      updates.Password = await bcrypt.hash(req.body.Password, 10);
    }

    try {
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username },
        { $set: updates },
        { new: true }
      );

      const token = jwt.sign({ id: updatedUser._id, username: updatedUser.Username }, secretKey, { expiresIn: '1h' });

      res.status(200).json({
        user: {
          _id: updatedUser._id,
          Username: updatedUser.Username,
          Email: updatedUser.Email,
          fullName: updatedUser.fullName,
          favoriteMovies: updatedUser.favoriteMovies,
        },
        token,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error: " + err);
    }
  }
);

// DELETE - Allow user to deregister
app.delete(
  "/Users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username } = req.params;
      const user = await Users.findOneAndDelete({ Username });

      if (user) {
        res.status(200).send(`${user.Username} has been deleted.`);
      } else {
        res.status(404).send("User not found.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
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
  

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});

