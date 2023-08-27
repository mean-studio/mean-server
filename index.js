// Replace if using a different env file or config
require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const session = require("express-session");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uuidv4 = require('uuid').v4;
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const nunjucks = require('nunjucks')
const app = express();
const port = process.env.port || 3000;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: uuidv4(),
  resave: false,
  saveUninitialized: true,
}))

// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

app.get("/get-oauth-link", async (req, res) => {
  const state = uuidv4();
  req.session.state = state
  const args = new URLSearchParams({ state, client_id: process.env.STRIPE_CLIENT_ID })
  const url = `https://connect.stripe.com/express/oauth/authorize?${args.toString()}`;
  return res.send({ url });
});

app.get("/authorize-oauth", async (req, res) => {
  const { code, state } = req.query;

  // Assert the state matches the state you provided in the OAuth link (optional).
  if (req.session.state !== state) {
    return res.status(403).json({ error: 'Incorrect state parameter: ' + state });
  }

  // Send the authorization code to Stripe's API.
  stripe.oauth.token({
    grant_type: 'authorization_code',
    code
  }).then(
    (response) => {
      const connected_account_id = response.stripe_user_id;
      saveAccountId(connected_account_id);

      // Render some HTML or redirect to a different page.
      return res.redirect(301, '/success.html')
    },
    (err) => {
      if (err.type === 'StripeInvalidGrantError') {
        return res.status(400).json({ error: 'Invalid authorization code: ' + code });
      } else {
        return res.status(500).json({ error: 'An unknown error occurred.' });
      }
    }
  );
});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
const saveAccountId = (id) => {
  // Save the connected account ID from the response to your database.
  console.log('Connected account ID: ' + id);
}

app.listen(port, () => console.log(`Node server listening on port ${port}!`));
module.exports = app
