
//P.S. i tried adding google calender API but there was some problem i was facing in generating tokens so at the end i had to drop it.
//just token credentials were left to put 


const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send'
];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes
});

console.log("===== AUTHORIZATION URL =====");
console.log("COPY THIS ENTIRE URL IN BROWSER:");
console.log(url);