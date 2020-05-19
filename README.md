# Getting started

  ## Prerequisites

  - Node and NPM
  - API and OAuth keys for Twitch OR a prepopulated env file

  ## Installation

  - [Clone repository](https://github.com/ClickPop/buffs-bot.git)
  - Fill in the `.env` file
  - Install dependancies 
    - `npm install`
  - Start server
    - `npm run server`

*A quick note on local testing. For the twitch webhooks to work you will need to setup a request forwarding service like [ngrok](https://ngrok.com/).*

# Available Routes

  ## Request info

  All requests require these headers:
  - Content-Type: `application/json`
  - Authorization: `API Key`

  All of the api routes responed with JSON.

  ## Standard
  ### These all use the decoded api key provided with the request to gather the required ID for lookups.
  **The only exception to this is the create route which requires you to include the twitch username*

  - `/api/create`
    - method: 
      - **POST**
    - body:
      - key: `twitch_username`
        - value: `whatever the twitch username is`
    - description: 
      - Creates a new bot and saves it to the database. Default joined value is false.
  - `/api/status`
    - method: 
      - **GET**
    - description: 
      - Gets the current status of the bot.
  - `/api/action`
    - method: 
      - **PUT**
    - body
      - key: `action`
        - value: `join`, `part`, or `updateUsername`
    - description: 
      - Depending on the action attribute, will either join or part the bot, or update the username in the database.
  - `/api/delete`
    - method: 
      - **DELETE**
    - description: 
      - Deletes a bot from memory and the database.
  - `/api/views`
    - method:
      - **GET**
    - query params
      - key: `from` *optional*
        - value: `ISO date to set the lower bounds of returned streams`
      - key: `to` *optional*
        - value: `ISO date to set the upper bounds of returned streams`
    - description
      - Returns all streams and associated views for the twitch id of the api key that called it. If to/from are set, only the streams between those dates will be returned

  ## Admin
  ### These routes require you to be an admin and complete their actions based on the supplied data.

  - `/api/admin/create`
    - method: 
      - **POST** 
    - body:
      - key: `twitch_userId`
        - value: `whatever the twitch ID is`
      - key: `twitch_username`
        - value: `whatever the twitch username is`
    - description: 
      - Creates a new bot and saves it to the database. Default joined value is false.
  - `/api/admin/status`
    - method: 
      - **GET**
    - description: 
      - Gets the current status of all the bots.
  - `/api/admin/status/twitch_userId`
    - method: 
      - **GET**
    - description: 
      - Gets the current status of the bot specified in the URL.
  - `/api/admin/action`
    - method: 
      - **PUT**
    - body
      - key: `twitch_userId`
        - value: `whatever the twitch ID is`
      - key: `twitch_username`
        - value: `whatever the twitch username is`
      - key: `action`
        - value: `join`, `part`, or `updateUsername`
    - description: 
      - Depending on the action attribute, will either join or part the bot, or update the username in the database.
  - `/api/admin/delete`
    - method: 
      - **DELETE**
    - body:
      - key: `twitch_userId`
        - value: `whatever the twitch ID is`
    - description: 
      - Deletes a bot from memory and the database.
  - `/api/admin/views`
    - method:
      - **GET**
    - query params
      - key: `twitch_userIds`
        - value: `list of comma separated twitch id's`
      - key: `from` *optional*
        - value: `ISO date to set the lower bounds of returned streams`
      - key: `to` *optional*
        - value: `ISO date to set the upper bounds of returned streams`
    - description
      - Returns all streams and associated views for the given twitch id's. If to/from are set, only the streams between those dates           will be returned
