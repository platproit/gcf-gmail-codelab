const { GoogleAuth } = require("google-auth-library");

/**
 * Instead of specifying the type of client you'd like to use (JWT, OAuth2, etc)
 * this library will automatically choose the right client based on the environment.
 */
async function main() {
  const Auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const client = await Auth.getClient();
  const projectId = await Auth.getProjectId();
  const url = `https://gmail.googleapis.com/gmail/v1/projects/${projectId}`;
  const res = await client.request({ url });
  console.log(res.data);
}

main().catch(console.error);

// googleapis is the official Google Node.js client library for a number of
// Google APIs, including Gmail.
import { google } from "googleapis";
const gmail = google.gmail("v1");

// Specify the access scopes required. If authorized, Google will grant your
// registered OAuth client access to your profile, email address, and data in
// your Gmail and Google Sheets.
const requiredScopes = [
  "profile",
  "email",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/spreadsheets",
];

const auth = Auth("datastore", requiredScopes, "email", true);

const GCP_PROJECT = process.env.GCP_PROJECT;
const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC;

// Call the Gmail API (Users.watch) to set up Gmail push notifications.
// Gmail will send a notification to the specified Cloud Pub/Sun topic
// every time a new mail arrives in inbox.
const setUpGmailPushNotifications = (email, pubsubTopic) => {
  return gmail.users.watch({
    userId: email,
    requestBody: {
      labelIds: ["INBOX"],
      topicName: `projects/${GCP_PROJECT}/topics/${pubsubTopic}`,
    },
  });
};

// If the authorization process completes successfully, set up Gmail push
// notification using the tokens returned
const onSuccess = async (req, res) => {
  let email;

  try {
    // Set up the googleapis library to use the returned tokens.
    email = await auth.auth.authedUser.getUserId(req, res);
    const OAuth2Client = await auth.auth.authedUser.getClient(req, res, email);
    google.options({ auth: OAuth2Client });
  } catch (err) {
    console.log(err);
    throw err;
  }

  try {
    await setUpGmailPushNotifications(email, PUBSUB_TOPIC);
  } catch (err) {
    console.log(err);
    if (
      !err
        .toString()
        .includes("one user push notification client allowed per developer")
    ) {
      throw err;
    }
  }

  res.send(`Successfully set up Gmail push notifications.`);
};

// If the authorization process fails, return an error message.
const onFailure = (err, req, res) => {
  console.log(err);
  res.send(`An error has occurred in the authorization process.`);
};

export const auth_init = auth.routes.init;
export const auth_callback = auth.routes.cb(onSuccess, onFailure);
