// let jwtSecret = "your_jwt_secret";

// let jwt = require("jsonwebtoken"),
//   passport = require("passport");

// require("./passport");

// let generateJWTToken = (user) => {
//   return jwt.sign(user, jwtSecret, {
//     subject: user.Username,
//     expiresIn: "7d",
//     algorithm: "HS256",
//   });
// };
// module.exports = (router) => {
//   router.post("/login", (req, res) => {
//     passport.authenticate("local", { session: false }, (error, user, info) => {
//       if (error || !user) {
//         return res.status(400).json({
//           message: "Something is not right",
//           user: user,
//         });
//       }
//       req.login(user, { session: false }, (error) => {
//         if (error) {
//           res.send(error);
//         }
//         let token = generateJWTToken(user.toJSON());
//         return res.json({ user, token });
//       });
//     })(req, res);
//   });
// };

const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const Models = require('./models.js');
const Users = Models.User;

const secretKey = 'your_secret_key';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretKey,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      const user = await Users.findById(jwt_payload.id).exec();
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = (app) => {
  app.use(passport.initialize());
};
