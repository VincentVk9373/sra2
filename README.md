# Foundry Vite Project

This README outlines the steps needed to set up and run the Foundry Vite project locally. Ensure you follow the installation instructions closely to get everything up and running without issues.

## Prerequisites

### Node.js

The project requires **Node.js v18** or higher. It is recommended to manage your Node.js versions using [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm). This allows you to switch between Node versions without affecting other projects.

To install NVM and Node.js, follow these steps:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
# Restart your terminal and then:
nvm install 18
nvm use 18
```

## Installation

Once the prerequisites are met, you can install the project dependencies by running:

```bash
npm install
```

This command will fetch and install all necessary packages required for the project to run.

## Running the Project

### Development Mode

To start the project in development mode, run:

```bash
npx vite serve
```

This will launch a Vite development server that is configured to intercept calls made to **systems/sra2** and proxy them appropriately, while serving all other files directly from Foundry.

## Building for Production

If you need to build the project for production, use:

```
npx vite build
```

This command compiles your JavaScript and assets into static files ready for production deployment. These files are in `./dist` directory.

## Foundry Configuration

Ensure Foundry is running locally on port 30000 to allow seamless interaction between the Vite server and Foundry.

```
# Start Foundry command (Example)
node resources/app/main.js --dataPath=<path_to_foundry_data>/foundrydata --port=30000
```

You need to link `<foundrydata>/systems/sra2` to the `public` directory of your repository.

When Foundry starts in the backend (Node.js), it will detect the necessary files in the public directory of the repository (these files are `systems/sra2/index.mjs` and `systems/sra2/sra2.css`).

When you connect to Foundry from a browser (frontend), Vite will intercept all requests and redirect them to Foundry, except for requests to `systems/sra2`. These files will be served by the Vite project.

## Note on Vite Server and Foundry Interaction

The Vite server is configured to handle specific API calls (e.g., to **systems/sra2**) directly, enhancing development efficiency. All other requests are forwarded to the local Foundry server, ensuring that the environment replicates the production setup as closely as possible.

## Compendiums management

Compendium sources are located in `src/packs`. Content are written in a yaml format.

Commands are available to manage them:

Compile compendiums to the dist folder:
```bash
node ./tools/packCompendiumsToDist.mjs
```

Extract compendiums from the dist folder (for example, after changing the content on the running server, to update the source files):
```bash
node ./tools/unpackCompendiumsFromDist.mjs
```


