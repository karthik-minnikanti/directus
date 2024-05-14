// @ts-nocheck
const axios = require('axios');
const config = require('./../../../config/nameMatchConfig');

function registerHook({ action }, { services, getSchema, logger, env }) {
  const { ItemsService, CollectionsService } = services;

  async function sendUpdatedNameMatchResults({ collection, keys, payload, key }) {
    logger.info(`Name match results manually updated for ${keys.length} rows`);
    const schema = await getSchema();
    const nameMatchReviewCollection = new ItemsService(collection, { schema });

    const existingRows = await nameMatchReviewCollection.readMany(keys);

    const acquiResults = existingRows.filter(({ source_application }) => source_application === config.sourceApplications.acqui);
    const kycResults = existingRows.filter(({ source_application }) => source_application === config.sourceApplications.kyc);

    try {
      const acquiPromises = acquiResults.map(({
        final_decision: finalDecision,
        lead_tracking_number: leadTrackingNumber
      })  => {
        logger.info(`Calling acqui lead service to update name match result for lead ${leadTrackingNumber}`)
        const requestPromise = axios.post(
          env.ACQUI_LEAD_SERVICE_ENDPOINT,
          {
            leadTrackingNumber,
            finalDecision
          }
        )
        return requestPromise
      });
      const kycPromises = kycResults.map(({
        final_decision: finalDecision,
        lead_tracking_number: leadTrackingNumber
      })  => {
        logger.info(`Calling kyc lead service to update name match result for lead ${leadTrackingNumber}`)
        const requestPromise = axios.post(
          env.KYC_LEAD_SERVICE_ENDPOINT,
          {
            leadTrackingNumber,
            finalDecision
          }
        )
        return requestPromise
      });

      await Promise.all([
        ...acquiPromises,
        ...kycPromises
      ]);
    } catch (err) {
      logger.error('Error pushing name match results to lead-service');
      logger.error(err);
    }
  }

  action('name_match.items.update', sendUpdatedNameMatchResults);
  action('name_match.items.create', ({ key, ...rest }) => sendUpdatedNameMatchResults({
    ...rest,
    keys: [ key ]
  }))
}

module.exports = registerHook;
