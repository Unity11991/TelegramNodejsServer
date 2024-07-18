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

server.get("/highscore/:score", function (req, res, next) {
  console.log("Received highscore request");
  console.log("Request params:", req.params);
  console.log("Request query:", req.query);

  if (!Object.hasOwnProperty.call(queries, req.query.id)) {
    console.log("Invalid query ID");
    return next();
  }

  // Parse the new score directly (no obfuscation)
  const newScore = parseInt(req.params.score, 10);

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
    };
  }

  // Retrieve the current high score
  bot.getGameHighScores({ user_id: query.from.id, chat_id: options.chat_id, message_id: options.message_id })
    .then((highScores) => {
      const currentHighScore = highScores && highScores.length > 0 ? highScores[0].score : 0;

      // Calculate the new overall high score
      const overallHighScore = currentHighScore + newScore;

      // Set the new overall high score
      bot.setGameScore(query.from.id, overallHighScore, options)
        .then(() => {
          console.log("Score added successfully");
          res.status(200).send("Score added successfully");
        })
        .catch((err) => {
          console.error("Error setting game score:", err);
          res.status(500).send("An error occurred");
        });
    })
    .catch((err) => {
      console.error("Error retrieving highscore:", err);
      res.status(500).send("An error occurred while retrieving the highscore");
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
