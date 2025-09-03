'use strict';

const { Homey } = require('homey');

class NLPFlowCards {
  
  static async createCards(app) {
    try {
      // Action card for processing a natural language query
      this.queryAction = app.homey.flow.getActionCard('nlp_query')
        .registerRunListener(async (args) => {
          try {
            const devices = await app.nlpIntegration.processQuery(args.query);
            return devices;
          } catch (error) {
            app.logger.error('Error processing NLP query:', error);
            throw new Error(app.homey.__('error.nlp_query_failed'));
          }
        });
      
      app.logger.info('NLP flow cards registered');
    } catch (error) {
      app.logger.error('Failed to create NLP flow cards:', error);
      throw error;
    }
  }
}

module.exports = NLPFlowCards;
