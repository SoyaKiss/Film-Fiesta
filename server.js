// var http = require("http"),
//   fs = require("fs"),
//   url = require("url"),
//   path = require("path");
// http
//   .createServer((request, response) => {
//     let addr = request.url,
//       q = new URL(addr, "http://" + request.headers.host),
//       filePath = "";

//     fs.appendFile(
//       path.join(__dirname, "log.txt"),
//       "URL: " + addr + "\nTimestamp: " + new Date() + "\n\n",
//       (err) => {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log("Added to log.");
//         }
//       }
//     );

//     if (q.pathname.includes("../documentation")) {
//       filePath = path.join(__dirname, "../documentation.html");
//     } else {
//       filePath = path.join(__dirname, "index.html");
//     }

//     fs.readFile(filePath, (err, data) => {
//       if (err) {
//         throw err;
//       }

//       response.writeHead(200, { "Content-Type": "text/html" });
//       response.write(data);
//       response.end();
//     });
//   })
//   .listen(8080);

// console.log("My first Node test server is running here on Port 8080. Welcome.");
