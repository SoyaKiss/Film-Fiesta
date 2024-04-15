let express = require("express");
let morgan = require("morgan");
let app = express();

app.use(express.static("public"));
app.use(morgan("common"));

let myTopMovies = [
  {
    title: "Mission Impossible",
    year: "1996",
    genre: "Action",
    mainActor: "Tom Cruise",
  },
  {
    title: "Old School",
    year: "2003",
    genre: "Comedy",
    mainActor: "Will Ferell",
  },
  {
    title: "A Time to Kill",
    year: "1996",
    genre: "Thriller",
    mainActor: "Matthew McConaughey",
  },
  {
    title: "The Hunger Games",
    year: "2012",
    genre: "Action",
    mainActor: "Jennifer Lawrence",
  },
  {
    title: "Guardians of the Galaxy",
    year: "2014",
    genre: "Action",
    mainActor: "Chris Pratt",
  },
  {
    title: "Jack Reacher",
    year: "2012",
    genre: "Action",
    mainActor: "Tom Cruise",
  },
  {
    title: "The Notebook",
    year: "2004",
    genre: "Romance",
    mainActor: "Rachel McAdams",
  },
  {
    title: "Wonder Woman",
    year: "2017",
    genre: "Action",
    mainActor: "Gal Gadot",
  },
  {
    title: "Training Day",
    year: "2001",
    genre: "Thriller",
    mainActor: "Denzel Washington",
  },
  {
    title: "The Gray Man",
    year: "2022",
    genre: "Action",
    mainActor: "Ryan Gosling",
  },
];

app.get("/movies", (req, res) => {
  res.json(myTopMovies);
});

app.get("/", (req, res) => {
  res.send("This is a random response!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080 and life is great.");
});
