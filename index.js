let express = require("express");
let bodyParser = require("body-parser");
let uuid = require("uuid");
let app = express();

app.use(bodyParser.json());

let users = [
  {
    id: "001",
    username: "Patty",
    email: "patty@gmail.com",
    favlist: [],
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

// This is to GET the full list of movies to users
app.get("/movies", (req, res) => {
  res.status(200).json(movies);
});

// Return data by single movie - title
app.get("/movies/:Title", (req, res) => {
  let { title } = req.params;
  let movie = movies.find((movie) => movie.Title === title);

  if (movie) {
    res.status(200).json(movie.Title);
  } else {
    res.status(400).send("nope, try again!");
  }
});

// Return the data by genre only
app.get("/movies/genre/:genre", (req, res) => {
  let { genre } = req.params;
  let movieGenre = movies.find((movie) => movie.Genre === genre);

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send("nope, not this type of movie.");
  }
});

// Return the data by Main Actor
app.get("/movies/main/:mainName", (req, res) => {
  let { mainName } = req.params;
  let main = movies.find((movie) => movie.Main.Name === mainName);

  if (main) {
    res.status(200).json(mainName);
  } else {
    res.status(400).send("nope, not in these movies.");
  }
});

app.listen(8080, () => {
  console.log("Server is running on port 8080 and life is great.");
});
