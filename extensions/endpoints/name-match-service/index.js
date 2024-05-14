// @ts-nocheck
const config = require('./../../../config/nameMatchConfig');

module.exports = async function (router, { services, exceptions, getSchema }) {
  const { ItemsService, CollectionsService } = services;
	const { ServiceUnavailableException, InvalidPayloadException } = exceptions;
  const schema = await getSchema();
  const reviewCollectionService = new ItemsService(config.reviewCollectionName, {
    schema,
  });
  const productionCollectionService = new ItemsService(config.productionCollectionName, {
    schema,
  });
  const collectionService = new CollectionsService({ schema })
  const knex = collectionService.knex;

  const requiredParams = [
    'aadhaar_name',
    'pan_name',
    'matched_on',
    'lead_tracking_number',
    'original_prediction',
    'score'
  ]

  router.post('/save-name-match-result', async (req, res, next) => {
    const {
      nsdl_name: nsdlName,
      aadhaar_name: aadhaarName,
      pan_name: panName,
      matched_on: matchedOn,
      lead_tracking_number: leadTrackingNumber,
      original_prediction: originalPrediction,
      score,
      nsdl_score: nsdlScore,
      pan_score: panScore,
      source_application: sourceApplication = config.sourceApplications.acqui
    } = req.body;

    for (let i = 0; i < requiredParams.length; i++) {
      if (!req.body[requiredParams[i]]) {
        return next( new InvalidPayloadException(`${requiredParams[i]} is required`) )
      }
    }

    try {
      const createResult = await reviewCollectionService.createOne({
        aadhaar_name: aadhaarName,
        nsdl_name: nsdlName,
        pan_name: panName,
        match_what: matchedOn,
        orig_prediction: originalPrediction,
        score: score,
        lead_tracking_number: leadTrackingNumber,
        status: 'review',
        nsdl_score: nsdlScore,
        pan_score: panScore,
        source_application: sourceApplication
      });
      res.status(201).json({
        success: true,
        data: {
          id: createResult
        },
        message: 'Successfully saved name match result',
      })
    } catch (err) {
      return next(new ServiceUnavailableException(err))
    }
  })

  router.post('/get-name-match-outcome', async (req, res, next) => {
    const {
      lead_tracking_number: leadTrackingNumber,
    } = req.body;

    if (!leadTrackingNumber) {
      return next( new InvalidPayloadException(`lead_tracking_number is required`) );
    }
    const query = `
      SELECT * FROM ${config.productionCollectionName} WHERE lead_tracking_number='${leadTrackingNumber}' ORDER BY date_created DESC
    `
    try {
      const assignedPgnInfo = await knex.raw(query);
      if (assignedPgnInfo.rowCount === 0) {
        res.status(200).send({
          data: {
            approved: false,
          },
          success: true
        })
      } else {
        res.status(200).send({
          data: {
            approved: true,
          },
          success: true
        })
      }
    } catch (err) {
      return next(new ServiceUnavailableException(err))
    }
  });
}
