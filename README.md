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

  ## Admin
  ### These routes require you to be an admin and complete their actions based on the supplied data.

  - `/api/create`
    - method: 
      - **POST** 
    - body:
      - key: `twitch_userId`
        - value: `whatever the twitch ID is`
      - key: `twitch_username`
        - value: `whatever the twitch username is`
    - description: 
      - Creates a new bot and saves it to the database. Default joined value is false.
  - `/api/status`
    - method: 
      - **GET**
    - description: 
      - Gets the current status of all the bots.
  - `/api/status/twitch_userId`
    - method: 
      - **GET**
    - description: 
      - Gets the current status of the bot specified in the URL.
  - `/api/action`
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
  - `/api/delete`
    - method: 
      - **DELETE**
    - body:
      - key: `twitch_userId`
        - value: `whatever the twitch ID is`
    - description: 
      - Deletes a bot from memory and the database.
