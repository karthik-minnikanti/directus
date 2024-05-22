// @ts-nocheck
const config = require('./config');

module.exports = async function (router, { services, exceptions, getSchema }) {
	const { ItemsService, CollectionsService } = services;
	const { ServiceUnavailableException, InvalidPayloadException } = exceptions;
  const schema = await getSchema();
  const collectionService = new CollectionsService({ schema })
  const knex = collectionService.knex;

	router.post('/assign-and-fetch-crn', async (req, res, next) => {
    const {
      lead_tracking_number,
      lead_tracking_number_bank,
      account_type
    } = req.body;

    try {
    if (!account_type) {
      return next(new InvalidPayloadException('account_type is required'));
    }
    let accountTypeCleaned = account_type.toLowerCase();
    const accountTypeDBInfo = config.allowedAccountTypes[accountTypeCleaned];
    if (!lead_tracking_number){
      return next(new InvalidPayloadException('lead_tracking_number is required'));
    } else if (!lead_tracking_number_bank){
      return next(new InvalidPayloadException('lead_tracking_number_bank is required'));
    } else if (!accountTypeDBInfo) {
      return next(new InvalidPayloadException('account_type is invalid'));
    }

    const tableName = accountTypeDBInfo.table;

      const getQuery = `
      SELECT * FROM ${tableName} WHERE lead_tracking_number='${lead_tracking_number}' AND lead_tracking_number_bank='${lead_tracking_number_bank}'
    `

      let assignedPgnInfo = await knex.raw(getQuery);

      if (assignedPgnInfo?.rowCount > 0) {
        res.status(200).json(assignedPgnInfo.rows[0])
        return
      }

    const setQuery = `
      UPDATE ${tableName} SET lead_tracking_number='${lead_tracking_number}', lead_tracking_number_bank='${lead_tracking_number_bank}', date_updated=NOW()
      WHERE ID =(SELECT ID FROM ${tableName} WHERE lead_tracking_number IS NULL AND lead_tracking_number_bank IS NULL AND is_active = true ORDER BY date_created LIMIT 1 FOR UPDATE)
    `

      const knexResponse = await knex.raw(setQuery);

      if (knexResponse?.rowCount === 0) {
      return next(new ServiceUnavailableException('Unable to assign crn and account number at this time'))
    }

       assignedPgnInfo = await knex.raw(getQuery);
    const {
      account_no,
      crn,
      identity_code,
      otp_product_code,
      otp_scheme_code,
      otp_sub_product_code
    } = assignedPgnInfo.rows[0]

		res.status(200).json(assignedPgnInfo.rows[0])
    }

    catch (e) {
      console.log(e)
      return next(new InvalidPayloadException(e?.detail || 'invalid payload'));
    }
	});
};
