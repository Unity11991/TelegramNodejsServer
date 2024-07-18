require("dotenv").config();
const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const gameName = "ZuraTap";
const webURL = "http://3.111.16.20:8080";

const server = express();
const bot = new TelegramBot(process.env.BOT_TOKEN || "7439126507:AAFsGlejIE1CMyMWr-qlIbLFvIT9BGp02lA", { polling: true });

const port = process.env.PORT || 8080;

const SCORE_TOKEN = [
  32452843,
  49979687,
  67867979,
  86028121,
  104395303,
  122949829,
  141650939,
  160481183,
  179424673
];

const queries = {};

function addAllNumbers(number) {
  const strNumber = number.toString();
  if (strNumber.length === 1) return number;

  const numbers = strNumber.split("");
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += parseInt(numbers[i], 10);
  }
  return addAllNumbers(sum);
}

bot.onText(/\/help/, (msg) =>
  bot.sendMessage(
    msg.from.id,
    "This bot implements a simple game. Say /game if you want to play."
  )
);

bot.onText(/\/start|\/game/, (msg) => bot.sendGame(msg.from.id, gameName));

bot.on("callback_query", function (query) {
  if (query.game_short_name !== gameName) {
    bot.answerCallbackQuery(query.id, { text: "Sorry, '" + query.game_short_name + "' is not available.", show_alert: true })
      .catch(err => console.error('Error answering callback query:', err));
  } else {
    queries[query.id] = query;
    const gameurl = `${webURL}?id=${query.id}`;
    bot.answerCallbackQuery(query.id, { url: gameurl })
      .catch(err => console.error('Error answering callback query:', err));
  }
});

bot.on("inline_query", function (iq) {
  bot.answerInlineQuery(iq.id, [
    { type: "game", id: "0", game_short_name: gameName },
  ]).catch(err => console.error('Error answering inline query:', err));
});

server.use(express.static(path.join(__dirname, "public")));

server.get("/highscore/:score", function (req, res, next) {
  console.log("Received highscore request");
  console.log("Request params:", req.params);
  console.log("Request query:", req.query);

  if (!Object.hasOwnProperty.call(queries, req.query.id)) {
    console.log("Invalid query ID");
    return next();
  }

  // Parse the score directly (no obfuscation)
  const realScore = parseInt(req.params.score, 10);

  let query = queries[req.query.id];
  let options;

  if (query.message) {
    options = {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    };
  } else {
    options = {
      inline_message_id: query.inline_message_id,
      force: true,
    };
  }

  // Set the game score
  bot.setGameScore(query.from.id, realScore, options)
    .then(() => {
      console.log("Score added successfully");

      // Now retrieve the updated high score
        bot.getGameHighScores(parseInt(query.from.id), options)
        .then((highScores) => {
          if (highScores && highScores.length > 0) {
            console.log(`Updated Highscore for user ${query.from.id}:`, highScores[0].score);
            res.status(200).send(`Updated Highscore for user ${query.from.id}: ${highScores[0].score}`);
          } else {
            console.log(`No highscore found for user ${query.from.id}`);
            res.status(404).send(`No highscore found for user ${query.from.id}`);
          }
        })
        .catch((err) => {
          console.error("Error retrieving highscore after setting score:", err);
          res.status(500).send("An error occurred while retrieving the highscore after setting the score");
        });
    })
    .catch((err) => {
      console.error("Error setting game score:", err);
      if (err.response.body.description === "Bad Request: BOT_SCORE_NOT_MODIFIED") {
        return res.status(204).send("New score is inferior to user's previous one");
      } else {
        return res.status(500).send("An error occurred while setting the score");
      }
    });
});


server.get("/getHighScore/:userId", function (req, res) {
  const userId = req.params.userId;

  bot.getGameHighScores({ user_id: userId, chat_id: null, message_id: null })
    .then((highScores) => {
      if (highScores && highScores.length > 0) {
        console.log(`Highscore for user ${userId}:`, highScores[0].score);
        res.status(200).send(`Highscore for user ${userId}: ${highScores[0].score}`);
      } else {
        console.log(`No highscore found for user ${userId}`);
        res.status(404).send(`No highscore found for user ${userId}`);
      }
    })
    .catch((err) => {
      console.error("Error retrieving highscore:", err);
      res.status(500).send("An error occurred while retrieving the highscore");
    });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
