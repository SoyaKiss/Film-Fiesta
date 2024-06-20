let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let Models = require("./models.js");

let app = express();
let Movies = Models.Movie;
let Users = Models.User;

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

const db = mongoose.connection;
db.once("open", () => {
  console.log("MongoDB connected successfully");
});
db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

app.use(bodyParser.json());
let cors = require("cors");
app.use(cors());

let auth = require("./auth.js")(app);
let passport = require("passport");
require("./passport.js");
let { check, validationResult } = require("express-validator");

// GET the list of all users currently in Users database collection
app.get("/Users", async (req, res) => {
  try {
    const users = await Users.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// POST endpoint to create a user:
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const hashedPassword = Users.hashPassword(req.body.Password);
    try {
      const user = await Users.findOne({ Username: req.body.Username });
      if (user) {
        return res.status(400).json({ message: req.body.Username + " already exists" });
      }
      const newUser = await Users.create({
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        fullName: req.body.fullName,  // Make sure fullName is provided
        Birthday: req.body.Birthday,
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error: " + error.message });
    }
  }
);

// PUT Endpoint to update a user:
app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send("Permission denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// DELETE - Remove a movie from the user's favorites
app.delete(
  "/Users/:Username/favorites/:movieIdToRemove",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username, movieIdToRemove } = req.params;

      const movie = await Movies.findOne({ _id: movieIdToRemove });

      if (!movie) {
        return res.status(400).send({ message: "No such movie" });
      }

      await Users.findOneAndUpdate(
        { Username },
        { $pull: { favoriteMovies: movieIdToRemove } }, // Remove by movieIdToRemove instead of movie._id
        { new: true }
      )
        .populate("favoriteMovies") // Ensure you populate favoriteMovies if necessary
        .then((updatedUser) => {
          res.json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error: " + err);
        });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// GET - Get a user's favorite movies
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

// Allow user to deregister
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

// This is to GET the full list of movies to users - GET
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);
// Return data by single movie - title - GET
app.get(
  "/Movies/:Title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Title } = req.params;
      const movie = await Movies.findOne({ Title });

      if (movie) {
        res.status(200).json(movie);
      } else {
        res.status(400).send("No such movie found.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Return the data by genre only
app.get(
  "/Movies/Genre/:genre",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { genre } = req.params;
      const moviesWithGenre = await Movies.find({ "Genre.Name": genre });

      if (moviesWithGenre.length > 0) {
        const movieTitles = moviesWithGenre
          .map((movie) => movie.Title)
          .join(", ");
        res.status(200).send(`"${movieTitles}" are "${genre}" type movies.`);
      } else {
        res.status(400).send(`No movies found with '${genre}' genre.`);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);
// Return the data by Main Actor
app.get(
  "/Movies/mainActor/:Name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Name } = req.params;
      const mainActorMovies = await Movies.find({ "mainActor.Name": Name });

      if (mainActorMovies.length > 0) {
        res.status(200).json({
          data:
            Name +
            " is the main actor in " +
            mainActorMovies.map((movie) => movie.Title).join(", "),
        });
      } else {
        res
          .status(400)
          .send("No movies found with " + Name + " as the main actor.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/Movies/supportingActor/:Name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Name } = req.params;
      const supportingActorMovies = await Movies.find({
        "supportingActor.Name": Name,
      });

      if (supportingActorMovies.length > 0) {
        res.status(200).json({
          data:
            Name +
            " is the supporting actor in " +
            supportingActorMovies.map((movie) => movie.Title).join(", "),
        });
      } else {
        res
          .status(400)
          .send("No movies found with " + Name + " as the supporting actor.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/Movies/:Title/Description",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Title } = req.params;
      const movie = await Movies.findOne({ Title });

      if (movie) {
        const description = movie.Description;
        res.status(200).send(description);
      } else {
        res.status(404).send("Movie not found.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/Movies/ImageURL/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { movieTitle } = req.params;
      const movie = await Movies.findOne({ Title: movieTitle });

      if (movie) {
        res.status(200).json(movie.ImageURL);
      } else {
        res.status(404).send("Movie not found.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

let port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
