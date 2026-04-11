'use strict';

module.exports = {
  ATHOM_API_CLIENT_ID: process.env.ATHOM_API_CLIENT_ID ?? '64691b4358336640a5ecee5c',
  ATHOM_API_CLIENT_SECRET: process.env.ATHOM_API_CLIENT_SECRET ?? 'ed09f559ae12b1522d00431f0bf7c5755603c41e',
  ATHOM_API_LOGIN_URL: process.env.ATHOM_API_LOGIN_URL ?? 'https://cli.athom.com',
  ATHOM_CLI_MESSAGE_URL: process.env.ATHOM_CLI_MESSAGE_URL ?? 'https://go.athom.com/cli-message',
};
