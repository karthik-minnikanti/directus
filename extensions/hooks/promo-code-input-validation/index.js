
// @ts-nocheck
module.exports = function registerHook({ filter }, { services, getSchema, exceptions }) {
    const { InvalidPayloadException } = exceptions;
    const { ItemsService } = services

    function validatePromoCodeDates(payload) {
        let today = new Date();
        let yesterdayDate = new Date();
        yesterdayDate.setDate(today.getDate() - 1);

        let yesterdayDateTimestamp = new Date(yesterdayDate).getTime();
        let startDateTimestamp = new Date(payload.start_date).getTime();
        let endDateTimeStamp = new Date(payload.end_date).getTime();

        if (payload.start_date && payload.end_date) {
            if (Boolean(yesterdayDateTimestamp > startDateTimestamp))
                throw new InvalidPayloadException(`Start date should be current date or greater than current date`);
            else if (Boolean(startDateTimestamp > endDateTimeStamp))
                throw new InvalidPayloadException(`End date should be same as start date or greater than start date`);
            else return payload
        }
        else throw new InvalidPayloadException(`start date/end date is missing or invalid`);
    }

    filter('promo_code_review.items.create', async (payload) => {
        validatePromoCodeDates(payload);
    })
    filter('promo_code_review.items.update', async (payload, collection) => {
        const promo_code_review_service = new ItemsService('promo_code_review', { schema: await getSchema() });
        const currentRow = await promo_code_review_service.readByQuery({
            filter: { id: { _eq: collection.keys[0] } }
        });
        validatePromoCodeDates({ ...currentRow[0], ...payload });
    })
}
