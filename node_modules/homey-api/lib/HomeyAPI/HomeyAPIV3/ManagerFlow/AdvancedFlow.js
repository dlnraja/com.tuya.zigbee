'use strict';

const Item = require('../Item');

/**
 * @class
 * @hideconstructor
 * @extends HomeyAPIV3.Item
 * @memberof HomeyAPIV3.ManagerFlow
 */
class AdvancedFlow extends Item {

  /**
   * Check whether this Flow misses one or more {@link FlowCard} or {@link FlowToken}.
   * @returns Promise<Boolean> - A boolean whether this Flow is broken.
   */
  async isBroken() {
    const managerFlow = this.homey.flow;
    if (!managerFlow.isConnected()) {
      throw new Error('Flow.isBroken requires ManagerFlow to be connected.');
    }

    const managerFlowToken = this.homey.flowtoken;
    if (!managerFlowToken.isConnected()) {
      throw new Error('Flow.isBroken requires ManagerFlowToken to be connected.');
    }

    // Array of local & global Token IDs.
    // For example [ 'foo', 'homey:x:y|abc' ]
    const tokenIds = [];

    const checkToken = async tokenId => {
      // If this is a global Token, fetch all FlowTokens
      if (tokenId.includes('|')) {
        const flowTokens = await managerFlowToken.getFlowTokens(); // Fill the cache
        for (const flowTokenId of Object.keys(flowTokens)) {
          tokenIds.push(flowTokenId);
        }

        tokenId = tokenId.replace('|', ':');
      }

      if (!tokenIds.includes(tokenId)) {
        throw new Error(`Missing Token: ${tokenId}`);
      }
    };

    const checkTokens = async card => {
      // Check droptoken
      if (card.droptoken) {
        await checkToken(card.droptoken);
      }

      if (typeof card.args === 'object') {
        for (const arg of Object.values(card.args)) {
          if (typeof arg !== 'string') continue;
          // eslint-disable-next-line no-unused-vars
          for (const [tokenMatch, tokenId] of arg.matchAll(/\[\[(.*?)\]\]/g)) {
            await checkToken(tokenId);
          }
        }
      }
    };

    // Check if FlowCards exist, and add Tokens
    for (const [cardId, card] of Object.entries(this.cards)) {
      switch (card.type) {
        case 'trigger': {
          try {
            await managerFlow.getFlowCardTriggers(); // Fill the cache
            const triggerCard = await this.manager.getFlowCardTrigger({ id: card.id });

            // Add FlowCardTrigger.tokens to internal tokens cache
            if (Array.isArray(triggerCard.tokens)) {
              for (const token of Object.values(triggerCard.tokens)) {
                tokenIds.push(`trigger::${cardId}::${token.id}`);
              }
            }

            break;
          } catch (err) {
            this.__debug(err);
            return true;
          }
        }
        case 'condition': {
          try {
            await managerFlow.getFlowCardConditions(); // Fill the cache
            // eslint-disable-next-line no-unused-vars
            const conditionCard = await this.manager.getFlowCardCondition({ id: card.id });

            // Add Error Token
            tokenIds.push(`card::${cardId}::error`);

            break;
          } catch (err) {
            this.__debug(err);
            return true;
          }
        }
        case 'action': {
          try {
            await managerFlow.getFlowCardActions(); // Fill the cache
            const actionCard = await this.manager.getFlowCardAction({ id: card.id });

            // Add Error Token
            tokenIds.push(`card::${cardId}::error`);

            // Add FlowCardAction.tokens to internal tokens cache
            if (Array.isArray(actionCard.tokens)) {
              for (const token of Object.values(actionCard.tokens)) {
                tokenIds.push(`action::${cardId}::${token.id}`);
              }
            }

            break;
          } catch (err) {
            this.__debug(err);
            return true;
          }
        }
        default: {
          // Do nothing
        }
      }
    }

    // Check Tokens
    for (const card of Object.values(this.cards)) {
      await checkTokens(card);
    }

    return false;
  }

}

module.exports = AdvancedFlow;
