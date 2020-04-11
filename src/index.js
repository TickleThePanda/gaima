#!/usr/bin/env -S node --no-warnings --unhandled-rejections=strict

import { GaimaApp } from './app.js';
import { GaimaCli } from './cli.js';

import { ConfigStore } from './config-store.js';
import { ConfigManager } from './config-manager.js';

const CONFIG_FILE_NAME = 'gaima.json';

const store = new ConfigStore(CONFIG_FILE_NAME);

async function run() {
  const configManager = new ConfigManager(await store.load());
  const app = new GaimaApp(configManager);

  const cli = new GaimaCli(app);

  let success = false;

  try {
    await cli.run();
    success = true;
  } catch (_) {
    success = false;
  }

  if (success) {
    store.save(configManager.config);
  }

}


run();
