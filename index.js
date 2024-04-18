let express = require("express");
let bodyParser = require("body-parser");
let uuid = require("uuid");
let app = express();

app.use(bodyParser.json());

let users = [
  {
    id: "001",
    name: "Patty",
    favoriteMovies: [],
  },
  {
    id: "002",
    name: "George",
    favoriteMovies: ["The Notebook"],
  },
];

let movies = [
  {
    Title: "Mission Impossible",
    Description:
      "An American agent, under false suspicion of disloyalty, must discover and expose the real spy without the help of his organization.",
    Year: "1996",
    Genre: "Action",
    ImageURL:
      "https://www.imdb.com/title/tt0117060/mediaviewer/rm560158209/?ref_=tt_ov_i",
    Main: {
      Name: "Tom Cruise",
      Birthday: "July 3 1962",
      Height: "5'7",
    },
    Secondary: {
      Name: "Jon Voight",
      Birthday: "December 29 1938",
      Height: "6'3",
    },
  },
];

// We are going to allow a new user to register - POST
app.post("/users", (req, res) => {
  let newUser = req.body;

  if (newUser.name) {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser);
  } else {
    res.status(400).send("Users need names.");
  }
});

// We want to allow users to update info
app.put("/users/:id", (req, res) => {
  let { id } = req.params;

  let updatedUser = req.body;
  let user = users.find((user) => user.id == id);

  if (user) {
    user.name = updatedUser.name;
    res.status(200).json(user);
  } else {
    res.status(400).send("No such user.");
  }
});

// We want to allow users to add a movie to their favorites list
app.post("/users/:id/:movieTitle", (req, res) => {
  let { id, movieTitle } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    user.favoriteMovies.push(movieTitle);
    res.status(200).send(movieTitle + " has been added to " + user.name +"'s favorite list!");
  } else {
    res.status(400).send("No such user.");
  }
});

// We want to allow users to remove a movie from their favorites list
app.delete("/users/:id/:movieTitle", (req, res) => {
  let { id, movieTitle } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
    res.status(200).send(movieTitle + " has been removed from " + user.name +"'s favorite list.");
  } else {
    res.status(400).send("No such user.");
  }
});

// Allow user to deregister
app.delete("/users/:id", (req, res) => {
  let { id } = req.params;

  let user = users.find((user) => user.id == id);

  if (user) {
    users = users.filter( user => user.id != id);
    res.status(200).send(user.name + " has been deleted.");
  } else {
    res.status(400).send("No such user.");
  }
});


// This is to GET the full list of movies to users
app.get("/movies", (req, res) => {
  res.status(200).json(movies);
});

// Return data by single movie - title
app.get("/movies/:Title", (req, res) => {
  let { Title } = req.params;
  let movie = movies.find((movie) => movie.Title === Title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(400).send("nope, try again!");
  }
});

// Return the data by genre only
app.get("/movies/genre/:genre", (req, res) => {
  let { genre } = req.params;
  let movieGenre = movies.filter((movie) => movie.Genre === genre);

  if (movieGenre.length > 0) {
    res
      .status(200)
      .json(movieGenre[0].Title + "is a(n) " + genre + " type of movie.");
  } else {
    res.status(400).send("nope, not this type of movie.");
  }
});

// Return the data by Main Actor
app.get("/movies/main/:mainName", (req, res) => {
  let { mainName } = req.params;
  let main = movies.find((movie) => movie.Main.Name === mainName);

  if (main) {
    res.status(200).json(mainName + " stars in " + main.Title);
  } else {
    res.status(400).send("nope, not in these movies.");
  }
});

app.listen(8080, () => {
  console.log("Server is running on port 8080 and life is great.");
});
