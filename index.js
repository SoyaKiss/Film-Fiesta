let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let Models = require("./models.js");

let app = express();
let Movies = Models.Movie;
let Users = Models.User;

// mongoose
//   .connect("mongodb://localhost:27017/[film-fiestaDB]", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })

mongoose
  .connect(
    " mongodb+srv://SoyaKiss:CakesnPaige2018@film-fiestadb.pxptm7a.mongodb.net/film-fiestaDB?retryWrites=true&w=majority&appName=film-fiestaDB ",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
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
  "/Users",
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
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashedPassword = Users.hashedPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + " already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: req.body.Password,
            Email: req.body.Email,
            fullName: req.body.fullName,
            birthday: req.body.birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
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

// POST - We want to allow users to add a movie to their favorites list (editing the list)
app.post(
  "/Users/:Username/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username, movieTitle } = req.params;
      console.log("Username:", Username);
      console.log("movieTitle:", movieTitle);

      const user = await Users.findOne({ Username });
      console.log("User:", user);

      if (user) {
        const ObjectId = mongoose.Types.ObjectId;
        const movieObjectId = new ObjectId();

        user.favoriteMovies.push(movieObjectId);
        await user.save();
        res
          .status(200)
          .send(
            `${movieTitle} has been added to ${user.Username}'s favorite list!`
          );
      } else {
        res.status(400).send("No such user. You cannot add any movies yet.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// We want to allow users to remove a movie from their favorites list
app.delete(
  "/Users/:Username/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { Username, movieTitle } = req.params;

      const user = await Users.findOne({ Username });

      if (user) {
        // Convert movieTitle to ObjectId
        const ObjectId = mongoose.Types.ObjectId;
        const movieObjectId = new ObjectId();

        // Filter out the movie with the given title
        user.favoriteMovies = user.favoriteMovies.filter(
          (movie) => !movie.equals(movieObjectId)
        );

        await user.save();
        res
          .status(200)
          .send(
            `${movieTitle} has been removed from ${user.Username}'s favorite list.`
          );
      } else {
        res.status(400).send("No such user.");
      }
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
