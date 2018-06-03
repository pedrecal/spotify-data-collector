const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('query-string');
const cookieParser = require('cookie-parser');
const keys = require('./config/keys');

let aux_token = null;
let aux_refresh_token = null;
const client_id = keys.spClientID;
const client_secret = keys.spClientSecret;
const redirect_uri = keys.redirectURI;
const scope = `user-read-private user-read-email user-library-read user-library-modify playlist-read-private playlist-modify-public 
               playlist-modify-private playlist-read-collaborative user-read-recently-played user-top-read user-read-private user-read-email
               user-read-email streaming user-modify-playback-state user-read-currently-playing user-read-playback-state user-follow-modify user-follow-read`;

const generateRandomString = length => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; ++i) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

const app = express();

app
  .use(express.static(`${__dirname}/public`))
  .use(cors())
  .use(cookieParser());

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  res.redirect(
    `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id,
      scope,
      redirect_uri,
      state,
    })}`
  );
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      `/#${querystring.stringify({
        error: 'state_mismatch',
      })}`
    );
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code,
        redirect_uri,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      },
      json: true,
    };

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const { access_token } = body;
        aux_token = access_token;
        const { refresh_token } = body;
        aux_refresh_token = refresh_token;

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { Authorization: `Bearer ${access_token}` },
          json: true,
        };

        // use the access token to access the Spotify Web API
        request.get(options, (error, response, body) => {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect(
          `/#${querystring.stringify({
            access_token,
            refresh_token,
          })}`
        );
      } else {
        res.redirect(
          `/#${querystring.stringify({
            error: 'invalid_token',
          })}`
        );
      }
    });
  }
});

app.get('/refresh_token', (req, res) => {
  // requesting access token from refresh token
  const { refresh_token } = req.query;
  aux_refresh_token = refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}` },
    form: {
      grant_type: 'refresh_token',
      refresh_token,
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const { access_token } = body;
      aux_token = access_token;
      res.send({
        access_token,
      });
    }
  });
});

app.get('/', (req, res) => {
  res.send('<a href=/history>History</a><br/><a href=/login>Login</a><br /><a href=/refresh_token>Refresh Token</a>');
});

app.get('/history', (req, res) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: { Authorization: `Bearer ${aux_token}` },
    json: true,
  };

  request.get(options, (error, response, body) => {
    res.send(body);
  });
});

app.listen(process.env.PORT || 5000);
