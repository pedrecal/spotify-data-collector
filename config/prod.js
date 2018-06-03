module.exports = {
  redirectURI: 'https://spotify-data-collector.herokuapp.com/callback',
  mongoURI: process.env.MONGO_URI,
  spClientID: process.env.SPOTIFY_CLIENT_ID,
  spClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};
