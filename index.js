let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let Models = require("./models.js");

let app = express();
let Movies = Models.Movie;
let Users = Models.User;

mongoose
  .connect("mongodb://localhost:27017/film-fiestaDB", {
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

app.get("/test", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.send("MongoDB connected!");
  } else {
    res.status(500).send("MongoDB connection failed!");
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
app.put("/Users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = req.body;

    const user = await Users.findByIdAndUpdate(id, updatedUser, { new: true });

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
app.post("/Users/:id/:movieTitle", async (req, res) => {
  try {
    const { id, movieTitle } = req.params;

    const user = await Users.findById(id);

    if (user) {
      user.favoriteMovies.push(movieTitle);
      await user.save();
      res
        .status(200)
        .send(
          movieTitle +
            " has been added to " +
            user.Username +
            "'s favorite list!"
        );
    } else {
      res.status(400).send("No such user. You can not add any movies yet.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// We want to allow users to remove a movie from their favorites list
app.delete("/Users/:id/:movieTitle", async (req, res) => {
  try {
    const { id, movieTitle } = req.params;

    const user = await Users.findById(id);

    if (user) {
      user.favoriteMovies = user.favoriteMovies.filter(
        (title) => title !== movieTitle
      );
      await user.save();
      res
        .status(200)
        .send(
          movieTitle +
            " has been removed from " +
            user.Username +
            "'s favorite list."
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
app.delete("/Users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Users.findByIdAndDelete(id);

    if (user) {
      res.status(200).send(user.Username + " has been deleted.");
    } else {
      res.status(400).send("No such user.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// We are going to allow a new user to register - POST
app.post("/Users", async (req, res) => {
  try {
    const newUser = req.body;

    if (
      !newUser.Username ||
      !newUser.Email ||
      !newUser.fullName ||
      !newUser.birthday
    ) {
      return res.status(400).send("All fields are required.");
    }

    const existingUser = await Users.findOne({ Username: newUser.Username });

    if (existingUser) {
      return res.status(400).send(newUser.Username + " already exists.");
    }

    const user = await Users.create(newUser);
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// We want to allow users to update info - PUT
app.put("/Users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = req.body;

    const user = await Users.findByIdAndUpdate(id, updatedUser, { new: true });

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

// We want to allow users to add a movie to their favorites list - POST
app.post("/Users/:id/:movieTitle", async (req, res) => {
  try {
    const { id, movieTitle } = req.params;

    const user = await Users.findById(id);

    if (!user) {
      return res.status(400).send("No such user.");
    }

    user.favoriteMovies.push(movieTitle);
    await user.save();

    res
      .status(200)
      .send(
        movieTitle + " has been added to " + user.Username + "'s favorite list!"
      );
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// We want to allow users to remove a movie from their favorites list - DELETE
app.delete("/Users/:id/:movieTitle", async (req, res) => {
  try {
    const { id, movieTitle } = req.params;

    const user = await Users.findById(id);

    if (!user) {
      return res.status(400).send("No such user.");
    }

    user.favoriteMovies = user.favoriteMovies.filter(
      (title) => title !== movieTitle
    );
    await user.save();

    res
      .status(200)
      .send(
        movieTitle +
          " has been removed from " +
          user.Username +
          "'s favorite list."
      );
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Allow user to deregister - DELETE
app.delete("/Users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Users.findByIdAndDelete(id);

    if (user) {
      res.status(200).send(user.Username + " has been deleted.");
    } else {
      res.status(400).send("No such user.");
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
app.get("/Movies/Genre/:Name", async (req, res) => {
  try {
    const { genre } = req.params;
    const movieGenre = await Movies.findOne({ "Genre.Name": genre });

    if (movieGenre) {
      res
        .status(200)
        .json(movieGenre.Title + " is a(n) " + genre + " type of movie.");
    } else {
      res.status(400).send("No such genre found.");
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

app.listen(8080, () => {
  console.log("This is just not working for me.");
});
