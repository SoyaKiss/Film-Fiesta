let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let Models = require("./models.js");

let app = express();
let Movies = Models.Movie;
let Users = Models.User;

mongoose
  .connect("mongodb://localhost:27017/[film-fiestaDB]", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
app.use(bodyParser.json());

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
app.post("/Users", async (req, res) => {
  await Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + "already exists");
      } else {
        Users.create({
          Username: req.body.Username,
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
});

// PUT Endpoint to update a user:
app.put("/Users/:Username", async (req, res) => {
  try {
    const { Username } = req.params;
    const updatedUser = req.body;

    const user = await Users.findOneAndUpdate({ Username }, updatedUser, {
      new: true,
    });

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(400).send("No such user.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// We want to allow users to add a movie to their favorites list
app.post("/Users/:Username/:movieTitle", async (req, res) => {
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
});

// We want to allow users to remove a movie from their favorites list
app.delete("/Users/:Username/:movieTitle", async (req, res) => {
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
});

// Allow user to deregister
app.delete("/Users/:Username", async (req, res) => {
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
});

// This is to GET the full list of movies to users - GET
app.get("/Movies", async (req, res) => {
  try {
    const movies = await Movies.find();
    res.status(200).json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// Return data by single movie - title - GET
app.get("/Movies/:Title", async (req, res) => {
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
});

// Return the data by genre only
app.get("/Movies/Genre/:genre", async (req, res) => {
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
});
// Return the data by Main Actor
app.get("/Movies/mainActor/:Name", async (req, res) => {
  try {
    const { Name } = req.params;
    const mainActorMovies = await Movies.find({ "mainActor.Name": Name });

    if (mainActorMovies.length > 0) {
      res
        .status(200)
        .json(
          Name +
            " stars in " +
            mainActorMovies.map((movie) => movie.Title).join(", ")
        );
    } else {
      res
        .status(400)
        .send("No movies found with " + Name + " as the main actor.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/Movies/supportingActor/:Name", async (req, res) => {
  try {
    const { Name } = req.params;
    const supportingActorMovies = await Movies.find({
      "supportingActor.Name": Name,
    });

    if (supportingActorMovies.length > 0) {
      res
        .status(200)
        .json(
          Name +
            " is the supporting actor in " +
            supportingActorMovies.map((movie) => movie.Title).join(", ")
        );
    } else {
      res
        .status(400)
        .send("No movies found with " + Name + " as the supporting actor.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/Movies/:Title/Description", async (req, res) => {
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
});

app.get("/Movies/ImageURL/:movieTitle", async (req, res) => {
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
});

app.listen(8080, () => {
  console.log("This is finally working for me.");
});
