#!/usr/bin/env -S node --no-warnings --unhandled-rejections=strict

import { GaimaApp } from './app.js';
import { GaimaCli } from './cli.js';

import { ConfigStore } from './config-store.js';
import { ConfigManager, ConfigError } from './config-manager.js';
import { ObjectStore } from './object-store.js';

const CONFIG_FILE_NAME = 'gaima.json';

const store = new ConfigStore(CONFIG_FILE_NAME);
const objectStore = new ObjectStore('.gaima/');

async function run() {

  const configManager = new ConfigManager(await store.load(), objectStore);
  const app = new GaimaApp(configManager);

  const cli = new GaimaCli(app);

  let success = false;

  try {
    await cli.run();
    success = true;
  } catch (e) {
    if (e instanceof ConfigError) {
      console.log('Error: ' + e.message);
    } else {
      console.error('Gaima encountered an internal error.')
      console.error(e);
    }
    success = false;
  }

  if (success) {
    store.save(configManager.config);
  }

}

run();
